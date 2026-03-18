const { prisma } = require('../config/database');
const { MercadoPagoConfig, PreApproval, Payment } = require('mercadopago');
const { AVAILABLE_PLANS } = require('../config/plans');

// Cliente de MercadoPago (singleton, sin logs del token)
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 10000 }
});

// ─── CREAR SUSCRIPCIÓN AUTOMÁTICA ────────────────────────────────────────────
//
// Recibe el subscriptionId de nuestra DB (ya creada por subscriptionController),
// crea una PreApproval en MercadoPago y devuelve el init_point para redirigir
// al usuario. MP se encarga de cobrar mensualmente de forma automática.
//
const createAutomaticSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const { user } = req;

    if (!user?.businessId) {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { business: true }
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Suscripción no encontrada' });
    }

    if (subscription.businessId !== user.businessId) {
      return res.status(403).json({ success: false, message: 'Sin permisos para esta suscripción' });
    }

    if (subscription.planType === 'FREE') {
      return res.status(400).json({ success: false, message: 'El plan gratuito no requiere pago' });
    }

    const plan = AVAILABLE_PLANS[subscription.planType];
    const planName = plan?.name || subscription.planType;
    const billingLabel = subscription.billingCycle === 'YEARLY' ? 'Anual' : 'Mensual';

    // Si ya tiene una preapproval activa en MP, la cancelamos antes de crear una nueva
    // (evita que el usuario quede con dos cobros activos al cambiar de plan)
    if (subscription.mercadoPagoSubscriptionId) {
      try {
        const preApprovalClient = new PreApproval(mpClient);
        await preApprovalClient.update({
          id: subscription.mercadoPagoSubscriptionId,
          body: { status: 'cancelled' }
        });
      } catch (e) {
        // Si ya estaba cancelada en MP, ignoramos el error
        console.log('ℹ️ Preapproval anterior ya estaba cancelada o no existe en MP');
      }
    }

    // Crear registro de pago PENDING en nuestra DB
    const payment = await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: subscription.priceAmount,
        billingCycle: subscription.billingCycle,
        status: 'PENDING'
      }
    });

    // Crear la PreApproval en MercadoPago
    // Una PreApproval = suscripción recurrente. El usuario la autoriza una vez
    // y MP cobra automáticamente en el intervalo configurado.
    const preApprovalClient = new PreApproval(mpClient);
    const response = await preApprovalClient.create({
      body: {
        reason: `${planName} - ${billingLabel} | Turnio`,
        auto_recurring: {
          frequency: subscription.billingCycle === 'YEARLY' ? 12 : 1,
          frequency_type: 'months',
          transaction_amount: subscription.priceAmount,
          currency_id: 'ARS'
        },
        back_url: `${process.env.FRONTEND_URL}/payment/success?payment=${payment.id}`,
        notification_url: `${process.env.BACKEND_URL}/api/mercadopago/subscription-webhook`,
        external_reference: payment.id,
        // Pre-cargamos el email del negocio en el checkout de MP
        payer_email: subscription.business.email
      }
    });

    // Guardar el ID de preapproval en nuestra suscripción
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        mercadoPagoSubscriptionId: response.id,
        status: 'PENDING'
      }
    });

    // Guardar el ID de preapproval en el pago también (como referencia)
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        preferenceId: response.id,
        mercadoPagoOrderId: response.id
      }
    });

    return res.json({
      success: true,
      data: {
        preapprovalId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point,
        paymentId: payment.id,
        subscription: {
          id: subscription.id,
          planType: subscription.planType,
          billingCycle: subscription.billingCycle,
          amount: subscription.priceAmount
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creando suscripción automática:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la suscripción',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── WEBHOOK DE SUSCRIPCIONES ─────────────────────────────────────────────────
//
// MP envía dos tipos de eventos:
//   - "preapproval": cuando el usuario autoriza, pausa o cancela la suscripción
//   - "subscription_authorized_payment": cuando MP cobra automáticamente cada mes
//
// IMPORTANTE: respondemos 200 inmediatamente para evitar reintentos de MP,
// y procesamos la lógica de forma asíncrona después.
//
const handleSubscriptionWebhook = async (req, res) => {
  // Responder inmediatamente para que MP no reintente
  res.status(200).json({ received: true });

  try {
    const { type, data } = req.body;

    if (!type || !data?.id) {
      return;
    }

    console.log(`📨 Webhook de suscripción recibido: type=${type}, id=${data.id}`);

    if (type === 'preapproval') {
      await handlePreapprovalEvent(data.id);
    } else if (type === 'subscription_authorized_payment') {
      await handleRecurringPaymentEvent(data.id);
    }

  } catch (error) {
    console.error('❌ Error procesando webhook de suscripción:', error);
  }
};

// Maneja cambios de estado en la PreApproval
// (cuando el usuario autoriza, pausa o cancela la suscripción)
const handlePreapprovalEvent = async (preapprovalId) => {
  const preApprovalClient = new PreApproval(mpClient);
  const preapprovalData = await preApprovalClient.get({ id: preapprovalId });

  const subscription = await prisma.subscription.findFirst({
    where: { mercadoPagoSubscriptionId: preapprovalId },
    include: { business: true }
  });

  if (!subscription) {
    console.log(`⚠️ Preapproval ${preapprovalId} no encontrada en nuestra DB`);
    return;
  }

  console.log(`🔔 Preapproval ${preapprovalId} - estado MP: ${preapprovalData.status}`);

  if (preapprovalData.status === 'authorized') {
    // El usuario autorizó la suscripción y MP cobró el primer mes.
    // Activamos la suscripción y calculamos la próxima fecha de cobro.
    const nextBillingDate = new Date();
    if (subscription.billingCycle === 'YEARLY') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        nextBillingDate
      }
    });

    // Actualizar el planType en el negocio
    await prisma.business.update({
      where: { id: subscription.businessId },
      data: { planType: subscription.planType }
    });

    // Marcar el pago PENDING como APPROVED
    await prisma.payment.updateMany({
      where: {
        subscriptionId: subscription.id,
        status: 'PENDING',
        mercadoPagoOrderId: preapprovalId
      },
      data: { status: 'APPROVED', paidAt: new Date() }
    });

    console.log(`✅ Suscripción activada: ${subscription.business.name} → ${subscription.planType}`);

  } else if (preapprovalData.status === 'paused') {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'SUSPENDED' }
    });
    console.log(`⏸️ Suscripción pausada: ${subscription.business.name}`);

  } else if (preapprovalData.status === 'cancelled') {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    });
    // Al cancelar, volvemos al plan FREE
    await prisma.business.update({
      where: { id: subscription.businessId },
      data: { planType: 'FREE' }
    });
    console.log(`🚫 Suscripción cancelada: ${subscription.business.name}`);
  }
};

// Maneja el cobro automático mensual/anual
// (MP ya cobró la tarjeta del usuario de forma automática)
const handleRecurringPaymentEvent = async (paymentId) => {
  const paymentClient = new Payment(mpClient);
  const paymentData = await paymentClient.get({ id: paymentId });

  if (!paymentData.external_reference) {
    console.log(`⚠️ Pago automático ${paymentId} sin external_reference`);
    return;
  }

  // external_reference es el preapproval_id que guardamos
  const subscription = await prisma.subscription.findFirst({
    where: { mercadoPagoSubscriptionId: paymentData.metadata?.preapproval_id || paymentData.external_reference },
    include: { business: true }
  });

  if (!subscription) {
    // Intentar por external_reference directo (puede ser el paymentId de nuestra DB)
    const paymentRecord = await prisma.payment.findFirst({
      where: { id: paymentData.external_reference },
      include: { subscription: { include: { business: true } } }
    });

    if (!paymentRecord?.subscription) {
      console.log(`⚠️ No se encontró suscripción para pago automático ${paymentId}`);
      return;
    }

    await processApprovedRecurringPayment(paymentRecord.subscription, paymentId, paymentData.transaction_amount);
    return;
  }

  await processApprovedRecurringPayment(subscription, paymentId, paymentData.transaction_amount);
};

const processApprovedRecurringPayment = async (subscription, mpPaymentId, amount) => {
  const nextBillingDate = new Date();
  if (subscription.billingCycle === 'YEARLY') {
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  } else {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  }

  // Extender la suscripción
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      nextBillingDate
    }
  });

  // Registrar el pago automático en nuestro historial
  await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      amount: amount || subscription.priceAmount,
      billingCycle: subscription.billingCycle,
      status: 'APPROVED',
      paidAt: new Date(),
      mercadoPagoPaymentId: String(mpPaymentId),
      mercadoPagoOrderId: String(mpPaymentId)
    }
  });

  console.log(`🔄 Renovación automática procesada: ${subscription.business.name} - próximo cobro: ${nextBillingDate.toLocaleDateString('es-AR')}`);
};

// ─── CANCELAR SUSCRIPCIÓN ────────────────────────────────────────────────────
//
// Cancela la PreApproval en MP y actualiza nuestra DB.
// El acceso se mantiene hasta el fin del período ya pagado (nextBillingDate).
//
const cancelSubscription = async (req, res) => {
  try {
    const { user } = req;

    if (!user?.businessId) {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { businessId: user.businessId, status: 'ACTIVE' }
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No tenés una suscripción activa' });
    }

    // Cancelar en MP si tiene preapproval
    if (subscription.mercadoPagoSubscriptionId) {
      try {
        const preApprovalClient = new PreApproval(mpClient);
        await preApprovalClient.update({
          id: subscription.mercadoPagoSubscriptionId,
          body: { status: 'cancelled' }
        });
      } catch (e) {
        console.error('⚠️ Error cancelando en MP (continuamos igual):', e.message);
      }
    }

    // Marcar como cancelada en nuestra DB.
    // El acceso sigue activo hasta nextBillingDate (ya pagado).
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: 'Suscripción cancelada. Tu acceso se mantiene hasta el fin del período actual.',
      data: { accessUntil: subscription.nextBillingDate }
    });

  } catch (error) {
    console.error('❌ Error cancelando suscripción:', error);
    return res.status(500).json({ success: false, message: 'Error al cancelar la suscripción' });
  }
};

// ─── MIGRACIÓN DE PRECIOS (ADMIN) ─────────────────────────────────────────────
//
// Actualiza el monto de cobro en todas las PreApprovals activas de un plan.
// Usar cuando se cambia el precio de un plan y queremos que se aplique
// a todos los suscriptores existentes (Opción 2 - precio uniforme).
//
// Solo debe ejecutarse después de notificar a los usuarios del cambio.
//
const syncPlanPrices = async (req, res) => {
  try {
    const { planType } = req.body;

    if (!planType || !AVAILABLE_PLANS[planType]) {
      return res.status(400).json({ success: false, message: 'planType inválido' });
    }

    const newPrice = AVAILABLE_PLANS[planType].price;

    if (newPrice === 0) {
      return res.status(400).json({ success: false, message: 'El plan FREE no tiene precio' });
    }

    // Buscar todas las suscripciones activas de ese plan con preapproval en MP
    const subscriptions = await prisma.subscription.findMany({
      where: {
        planType,
        status: { in: ['ACTIVE', 'PENDING'] },
        mercadoPagoSubscriptionId: { not: null }
      },
      include: { business: true }
    });

    const results = { updated: [], failed: [] };
    const preApprovalClient = new PreApproval(mpClient);

    for (const sub of subscriptions) {
      try {
        // Solo actualizar si el precio cambió
        if (sub.priceAmount === newPrice) {
          results.updated.push({ id: sub.id, business: sub.business.name, status: 'sin_cambio' });
          continue;
        }

        // Actualizar monto en MP
        await preApprovalClient.update({
          id: sub.mercadoPagoSubscriptionId,
          body: {
            auto_recurring: { transaction_amount: newPrice }
          }
        });

        // Actualizar monto en nuestra DB
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { priceAmount: newPrice }
        });

        results.updated.push({
          id: sub.id,
          business: sub.business.name,
          oldPrice: sub.priceAmount,
          newPrice,
          status: 'actualizado'
        });

      } catch (error) {
        console.error(`❌ Error actualizando suscripción ${sub.id}:`, error.message);
        results.failed.push({
          id: sub.id,
          business: sub.business.name,
          error: error.message
        });
      }
    }

    console.log(`💰 Migración de precios ${planType}: ${results.updated.length} actualizadas, ${results.failed.length} fallidas`);

    return res.json({
      success: true,
      message: `Migración completada para plan ${planType}`,
      newPrice,
      data: results
    });

  } catch (error) {
    console.error('❌ Error en migración de precios:', error);
    return res.status(500).json({ success: false, message: 'Error en migración de precios' });
  }
};

module.exports = {
  createAutomaticSubscription,
  handleSubscriptionWebhook,
  cancelSubscription,
  syncPlanPrices
};
