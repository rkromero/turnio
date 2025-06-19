const { prisma } = require('../config/database');

// Log para depuración del token de MercadoPago
console.log('Access Token MercadoPago:', process.env.MERCADOPAGO_ACCESS_TOKEN);

// MercadoPago SDK v2
const { MercadoPagoConfig, Preference, Payment, Subscription } = require('mercadopago');

// Instanciar cliente de MercadoPago
console.log('🔑 Inicializando MercadoPago con token:', process.env.MERCADOPAGO_ACCESS_TOKEN);
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

// Crear suscripción automática con MercadoPago (cobro recurrente)
const createAutomaticSubscription = async (req, res) => {
  try {
    console.log('🔑 Token MercadoPago al crear suscripción:', process.env.MERCADOPAGO_ACCESS_TOKEN);
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
        status: 'ACTIVE'
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
          status: 'ACTIVE'
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

// Verificar suscripciones vencidas (para ejecutar con cron)
const checkExpiredSubscriptions = async () => {
  try {
    console.log('🔍 Verificando suscripciones vencidas...');
    
    const now = new Date();
    
    // Buscar suscripciones que deberían renovarse hoy
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: {
          lte: now
        },
        planType: {
          not: 'FREE'
        }
      },
      include: {
        business: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    console.log(`📊 Encontradas ${expiredSubscriptions.length} suscripciones para renovar`);

    for (const subscription of expiredSubscriptions) {
      try {
        console.log(`🔄 Procesando renovación para: ${subscription.business.name} (${subscription.planType})`);
        
        // Crear nuevo pago para la renovación
        const payment = await prisma.payment.create({
          data: {
            subscriptionId: subscription.id,
            amount: subscription.priceAmount,
            billingCycle: subscription.billingCycle,
            status: 'PENDING',
            dueDate: now
          }
        });

        // Si tiene suscripción automática de MercadoPago, procesar automáticamente
        if (subscription.mercadoPagoSubscriptionId) {
          console.log(`💳 Procesando pago automático para suscripción: ${subscription.mercadoPagoSubscriptionId}`);
          
          // Aquí se procesaría el pago automático con MercadoPago
          // Por ahora, marcamos como pendiente para procesamiento manual
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'PAYMENT_FAILED' }
          });
          
          console.log(`⚠️  Suscripción marcada como PAYMENT_FAILED para procesamiento manual`);
        } else {
          // Sin suscripción automática, marcar como pendiente de pago
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'PAYMENT_FAILED' }
          });
          
          console.log(`⚠️  Suscripción sin pago automático marcada como PAYMENT_FAILED`);
        }
        
      } catch (error) {
        console.error(`❌ Error procesando renovación para ${subscription.business.name}:`, error);
      }
    }

    console.log('✅ Verificación de suscripciones vencidas completada');
    
  } catch (error) {
    console.error('❌ Error verificando suscripciones vencidas:', error);
  }
};

module.exports = {
  createAutomaticSubscription,
  handleSubscriptionWebhook,
  checkExpiredSubscriptions
}; 