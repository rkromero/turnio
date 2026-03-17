const { prisma } = require('../config/database');
const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Preference, Payment, Subscription } = require('mercadopago');

const prismaClient = new PrismaClient();

// MercadoPago SDK v2
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 5000,
    idempotencyKey: 'abc'
  }
});

// Estados de suscripción mejorados
const SUBSCRIPTION_STATES = {
  ACTIVE: 'ACTIVE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUSPENDED: 'SUSPENDED',
  GRACE_PERIOD: 'GRACE_PERIOD',
  CANCELLED: 'CANCELLED'
};

// Configuración de reintentos
const RETRY_CONFIG = {
  maxRetries: 3,           // Máximo 3 intentos
  retryIntervals: [1, 3, 7], // Día 1, 3 y 7 después del fallo
  gracePeriodDays: 10      // 10 días de período de gracia
};

// Función para calcular próxima fecha de cobro
const calculateNextBillingDate = (currentDate, billingCycle) => {
  const nextDate = new Date(currentDate);
  if (billingCycle === 'MONTHLY') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  return nextDate;
};

// Función para calcular fecha de reintento
const calculateRetryDate = (currentDate, retryNumber) => {
  const retryDate = new Date(currentDate);
  retryDate.setDate(retryDate.getDate() + RETRY_CONFIG.retryIntervals[retryNumber - 1]);
  return retryDate;
};

// Crear suscripción automática con MercadoPago (cobro recurrente)
const createAutomaticSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const { user } = req;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    // Buscar la suscripción
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { business: true }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada'
      });
    }

    if (subscription.businessId !== user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para esta suscripción'
      });
    }

    // Determinar precio y descripción
    const planNames = {
      'FREE': 'Plan Gratuito',
      'BASIC': 'Plan Básico', 
      'PREMIUM': 'Plan Premium',
      'ENTERPRISE': 'Plan Empresa'
    };

    const planName = planNames[subscription.planType] || subscription.planType;
    const billingCycle = subscription.billingCycle === 'YEARLY' ? 'Anual' : 'Mensual';
    
    // Crear el registro de pago en nuestra base de datos
    const payment = await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: subscription.priceAmount,
        billingCycle: subscription.billingCycle,
        status: 'PENDING'
      }
    });

    // Configurar la suscripción automática de MercadoPago
    const subscriptionData = {
      reason: `${planName} - ${billingCycle}`,
      auto_recurring: {
        frequency: subscription.billingCycle === 'YEARLY' ? 12 : 1, // 12 meses para anual, 1 mes para mensual
        frequency_type: "months",
        transaction_amount: subscription.priceAmount,
        currency_id: "ARS"
      },
      back_url: `${process.env.FRONTEND_URL}/subscription/success?payment=${payment.id}`,
      external_reference: payment.id,
      notification_url: `${process.env.BACKEND_URL}/api/mercadopago/subscription-webhook`,
      metadata: {
        subscription_id: subscription.id,
        business_id: subscription.businessId,
        payment_id: payment.id,
        plan_type: subscription.planType,
        billing_cycle: subscription.billingCycle
      }
    };

    console.log('💳 Creando suscripción automática de MercadoPago:', {
      planType: subscription.planType,
      amount: subscription.priceAmount,
      billingCycle: subscription.billingCycle,
      businessName: subscription.business.name
    });

    // Crear la suscripción en MercadoPago (SDK v2)
    const subClient = new Subscription(mpClient);
    const response = await subClient.create({ body: subscriptionData });

    // Actualizar el pago con el ID de suscripción
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        preferenceId: response.id,
        mercadoPagoOrderId: response.id
      }
    });

    // Actualizar la suscripción con el ID de MercadoPago
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        mercadoPagoSubscriptionId: response.id,
        status: 'PENDING'
      }
    });

    console.log('✅ Suscripción automática creada exitosamente:', response.id);

    // Responder con los datos necesarios para el frontend
    res.json({
      success: true,
      data: {
        subscriptionId: response.id,
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point,
        paymentId: payment.id,
        subscription: {
          id: subscription.id,
          planType: subscription.planType,
          billingCycle: subscription.billingCycle,
          amount: subscription.priceAmount,
          status: 'PENDING'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creando suscripción automática de MercadoPago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// === SISTEMA MEJORADO DE MANEJO DE FALLOS ===

// Función para manejar el período de gracia
const handleGracePeriod = async (subscription) => {
  try {
    const now = new Date();
    const gracePeriodEnd = subscription.gracePeriodEnd;
    
    if (now > gracePeriodEnd) {
      // Se acabó el período de gracia - suspender servicio
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATES.SUSPENDED,
          suspendedAt: now
        }
      });
      
      console.log(`🚫 Servicio suspendido para: ${subscription.business.name}`);
      
      // Enviar notificación de suspensión
      await sendSuspensionNotification(subscription);
      
    } else {
      // Recordatorio durante período de gracia
      const daysLeft = Math.ceil((gracePeriodEnd - now) / (1000 * 60 * 60 * 24));
      
      if ([7, 3, 1].includes(daysLeft)) {
        await sendGracePeriodReminder(subscription, daysLeft);
      }
    }
    
  } catch (error) {
    console.error('❌ Error manejando período de gracia:', error);
  }
};

// Funciones de notificación (placeholder - implementar con email/SMS)
const sendGracePeriodNotification = async (subscription, gracePeriodEnd) => {
  console.log(`📧 Enviando notificación de período de gracia a: ${subscription.business.name} hasta ${gracePeriodEnd.toLocaleDateString()}`);
  // TODO: Implementar envío de email/SMS
};

const sendGracePeriodReminder = async (subscription, daysLeft) => {
  console.log(`📧 Enviando recordatorio de período de gracia (${daysLeft} días restantes) a: ${subscription.business.name}`);
  // TODO: Implementar envío de email/SMS
};

const sendSuspensionNotification = async (subscription) => {
  console.log(`📧 Enviando notificación de suspensión a: ${subscription.business.name}`);
  // TODO: Implementar envío de email/SMS
};

// Webhook para suscripciones automáticas
const handleSubscriptionWebhook = async (req, res) => {
  try {
    console.log('🔔 Webhook de suscripción automática recibido:', {
      type: req.body.type,
      data: req.body.data
    });

    const { type, data } = req.body;

    if (type === 'subscription_authorized_payment') {
      const paymentId = data.id;
      
      // Obtener información del pago desde MercadoPago
      const paymentClient = new Payment(mpClient);
      const paymentInfo = await paymentClient.get({ id: paymentId });
      const paymentData = paymentInfo;

      console.log('💳 Pago automático recibido:', {
        id: paymentData.id,
        status: paymentData.status,
        externalReference: paymentData.external_reference
      });

      // Buscar nuestro pago interno
      const payment = await prisma.payment.findUnique({
        where: { id: paymentData.external_reference },
        include: { 
          subscription: { 
            include: { business: true } 
          } 
        }
      });

      if (!payment) {
        console.error('❌ Pago no encontrado en nuestra base de datos:', paymentData.external_reference);
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      // Mapear estados de MercadoPago a nuestros estados
      let newStatus = 'PENDING';
      switch (paymentData.status) {
        case 'approved':
          newStatus = 'APPROVED';
          break;
        case 'rejected':
        case 'cancelled':
          newStatus = 'REJECTED';
          break;
        default:
          newStatus = 'PENDING';
      }

      // Actualizar el pago
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: newStatus,
          paidAt: newStatus === 'APPROVED' ? new Date() : null
        }
      });

      // Si el pago fue aprobado, actualizar la suscripción
      if (newStatus === 'APPROVED') {
        // Calcular la próxima fecha de cobro
        const nextBillingDate = new Date();
        if (payment.subscription.billingCycle === 'MONTHLY') {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        } else {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }

        await prisma.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            status: 'ACTIVE',
            nextBillingDate: nextBillingDate
          }
        });

        console.log(`✅ Pago automático procesado: ${payment.subscription.planType} para ${payment.subscription.business.name}`);
      }

      res.json({ received: true });
    } else {
      res.json({ received: true });
    }
  } catch (error) {
    console.error('❌ Error en webhook de suscripción automática:', error);
    res.status(500).json({ success: false, message: 'Error en webhook' });
  }
};

// === SISTEMA MEJORADO DE MANEJO DE FALLOS ===

// Función para manejar el período de gracia
const handlePaymentFailure = async (subscription) => {
  try {
    console.log(`⚠️ Manejando fallo de pago para: ${subscription.business.name}`);
    
    const now = new Date();
    const retryCount = subscription.retryCount || 0;
    
    if (retryCount < RETRY_CONFIG.maxRetries) {
      // Programar siguiente intento
      const nextRetryDate = calculateRetryDate(now, retryCount + 1);
      
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATES.PAYMENT_FAILED,
          retryCount: retryCount + 1,
          lastRetryDate: now,
          nextRetryDate: nextRetryDate
        }
      });
      
      console.log(`🔄 Programado reintento ${retryCount + 1}/${RETRY_CONFIG.maxRetries} para: ${nextRetryDate.toLocaleDateString()}`);
      
      // Enviar notificación al cliente
      await sendPaymentFailureNotification(subscription, retryCount + 1);
      
    } else {
      // Se agotaron los reintentos - iniciar período de gracia
      const gracePeriodEnd = new Date(now);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + RETRY_CONFIG.gracePeriodDays);
      
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATES.GRACE_PERIOD,
          gracePeriodEnd: gracePeriodEnd,
          retryCount: retryCount + 1
        }
      });
      
      console.log(`⏰ Iniciando período de gracia hasta: ${gracePeriodEnd.toLocaleDateString()}`);
      
      // Enviar notificación de período de gracia
      await sendGracePeriodNotification(subscription, gracePeriodEnd);
    }
    
  } catch (error) {
    console.error('❌ Error manejando fallo de pago:', error);
  }
};

// Función para manejar el período de gracia
const handleGracePeriodNotification = async (subscription, gracePeriodEnd) => {
  console.log(`📧 Enviando notificación de período de gracia a: ${subscription.business.name} hasta ${gracePeriodEnd.toLocaleDateString()}`);
  // TODO: Implementar envío de email/SMS
};

// Funciones de notificación (placeholder - implementar con email/SMS)
const sendPaymentFailureNotification = async (subscription, retryNumber) => {
  console.log(`📧 Enviando notificación de fallo de pago (intento ${retryNumber}) a: ${subscription.business.name}`);
  // TODO: Implementar envío de email/SMS
};

// Verificar suscripciones vencidas (MEJORADO)
const checkExpiredSubscriptions = async () => {
  try {
    console.log('🔍 Verificando suscripciones vencidas...');
    
    const now = new Date();
    
    // 1. Buscar suscripciones que deberían renovarse hoy
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATES.ACTIVE,
        nextBillingDate: { lte: now },
        planType: { not: 'FREE' }
      },
      include: { business: true }
    });

    // 2. Buscar suscripciones para reintento
    const retrySubscriptions = await prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATES.PAYMENT_FAILED,
        nextRetryDate: { lte: now },
        retryCount: { lt: RETRY_CONFIG.maxRetries }
      },
      include: { business: true }
    });

    // 3. Buscar suscripciones en período de gracia
    const gracePeriodSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SUBSCRIPTION_STATES.GRACE_PERIOD
      },
      include: { business: true }
    });

    console.log(`📊 Suscripciones encontradas - Vencidas: ${expiredSubscriptions.length}, Reintentos: ${retrySubscriptions.length}, Período de gracia: ${gracePeriodSubscriptions.length}`);

    // Procesar suscripciones vencidas
    for (const subscription of expiredSubscriptions) {
      try {
        console.log(`🔄 Procesando renovación para: ${subscription.business.name}`);
        await processSubscriptionRenewal(subscription);
      } catch (error) {
        console.error(`❌ Error procesando renovación:`, error);
        await handlePaymentFailure(subscription);
      }
    }

    // Procesar reintentos
    for (const subscription of retrySubscriptions) {
      try {
        console.log(`🔁 Procesando reintento para: ${subscription.business.name}`);
        await processSubscriptionRenewal(subscription);
      } catch (error) {
        console.error(`❌ Error en reintento:`, error);
        await handlePaymentFailure(subscription);
      }
    }

    // Procesar período de gracia
    for (const subscription of gracePeriodSubscriptions) {
      await handleGracePeriod(subscription);
    }

    console.log('✅ Verificación de suscripciones completada');
    
  } catch (error) {
    console.error('❌ Error verificando suscripciones:', error);
  }
};

// Función auxiliar para procesar renovación
const processSubscriptionRenewal = async (subscription) => {
  if (subscription.mercadoPagoSubscriptionId) {
    console.log(`💳 Procesando pago automático para: ${subscription.mercadoPagoSubscriptionId}`);
    
    const subClient = new Subscription(mpClient);
    const paymentResponse = await subClient.get({ id: subscription.mercadoPagoSubscriptionId });

    if (paymentResponse.status === 'authorized') {
      // Crear registro de pago exitoso
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: subscription.priceAmount,
          status: 'APPROVED',
          billingCycle: subscription.billingCycle,
          paidAt: new Date(),
          mercadoPagoPaymentId: paymentResponse.last_payment?.id,
          mercadoPagoOrderId: subscription.mercadoPagoSubscriptionId
        }
      });

      // Actualizar suscripción como activa
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATES.ACTIVE,
          nextBillingDate: calculateNextBillingDate(new Date(), subscription.billingCycle),
          retryCount: 0,
          lastRetryDate: null,
          nextRetryDate: null
        }
      });

      console.log(`✅ Pago automático exitoso para: ${subscription.business.name}`);
    } else {
      throw new Error(`Pago no autorizado: ${paymentResponse.status}`);
    }
  } else {
    throw new Error('Sin suscripción automática configurada');
  }
};

const handlePaymentSuccess = async (subscriptionId, paymentId, mercadoPagoSubscriptionId) => {
  try {
    console.log('🔍 Procesando pago exitoso:', {
      subscriptionId,
      paymentId,
      mercadoPagoSubscriptionId
    });

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SUBSCRIPTION_STATES.ACTIVE,
        mercadoPagoSubscriptionId,
        retryCount: 0,
        lastRetryDate: null,
        nextRetryDate: null,
        gracePeriodEnd: null,
        suspendedAt: null
      }
    });

    console.log('✅ Suscripción actualizada:', {
      id: updatedSubscription.id,
      status: updatedSubscription.status
    });

    return updatedSubscription;
  } catch (error) {
    console.error('❌ Error al procesar pago exitoso:', error);
    throw error;
  }
};

module.exports = {
  createAutomaticSubscription,
  handleSubscriptionWebhook,
  checkExpiredSubscriptions,
  handlePaymentSuccess,
  SUBSCRIPTION_STATES,
  RETRY_CONFIG
}; 