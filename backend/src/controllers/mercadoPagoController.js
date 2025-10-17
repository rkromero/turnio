const { prisma } = require('../config/database');

// MercadoPago SDK v2
const { MercadoPagoConfig, Preference, Payment, Subscription } = require('mercadopago');

// Instanciar cliente de MercadoPago
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

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
        currency_id: "ARS",
        free_trial: {
          frequency: 1,
          frequency_type: "months",
          first_time_activation: true
        }
      },
      back_url: `${process.env.FRONTEND_URL}/subscription/success?payment=${payment.id}`,
      external_reference: payment.id,
      notification_url: `${process.env.BACKEND_URL}/api/mercadopago/subscription-webhook`,
      payer: {
        email: user.email
      },
      metadata: {
        subscription_id: subscription.id,
        business_id: subscription.businessId,
        payment_id: payment.id,
        plan_type: subscription.planType,
        billing_cycle: subscription.billingCycle,
        user_email: user.email
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

      // Si el pago fue aprobado, actualizar la suscripción y el plan del negocio
      if (newStatus === 'APPROVED') {
        await prisma.subscription.update({
          where: { id: payment.subscription.id },
          data: { status: 'ACTIVE' }
        });
        await prisma.business.update({
          where: { id: payment.subscription.businessId },
          data: { planType: payment.subscription.planType }
        });
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

// Crear preferencia de pago para suscripción (método original)
const createSubscriptionPayment = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const { user } = req;

    console.log('💳 [create-payment] Iniciando creación de pago para subscriptionId:', subscriptionId);

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
      console.log('❌ Suscripción no encontrada:', subscriptionId);
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada'
      });
    }

    console.log('📋 Suscripción encontrada:', {
      id: subscription.id,
      planType: subscription.planType,
      priceAmount: subscription.priceAmount,
      billingCycle: subscription.billingCycle,
      hasMetadata: !!subscription.metadata
    });

    if (subscription.businessId !== user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para esta suscripción'
      });
    }

    // Determinar el monto a cobrar
    let amountToPay = subscription.priceAmount;
    
    // Si hay upgrade pendiente, usar ese monto
    const pendingUpgrade = subscription.metadata?.pendingUpgrade;
    if (pendingUpgrade && pendingUpgrade.amount) {
      amountToPay = pendingUpgrade.amount;
      console.log('💰 Usando monto de upgrade pendiente:', amountToPay);
    }

    // Validar que tenemos un monto válido
    if (!amountToPay || amountToPay === 0) {
      console.log('❌ No se pudo determinar el monto a pagar');
      return res.status(400).json({
        success: false,
        message: 'No se pudo determinar el monto a pagar'
      });
    }

    // Determinar precio y descripción
    const planNames = {
      'FREE': 'Plan Gratuito',
      'BASIC': 'Plan Básico', 
      'PREMIUM': 'Plan Premium',
      'ENTERPRISE': 'Plan Empresa'
    };

    // Si hay upgrade pendiente, usar el plan de destino para el título
    let planTypeToShow = subscription.planType;
    if (pendingUpgrade && pendingUpgrade.toPlan) {
      planTypeToShow = pendingUpgrade.toPlan;
      console.log('📝 Usando nombre del plan de upgrade:', planTypeToShow);
    }

    const planName = planNames[planTypeToShow] || planTypeToShow;
    const billingCycle = subscription.billingCycle === 'YEARLY' ? 'Anual' : 'Mensual';
    
    // Crear el registro de pago en nuestra base de datos
    const payment = await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: amountToPay,
        billingCycle: subscription.billingCycle,
        status: 'PENDING'
      }
    });

    console.log('✅ Payment creado:', payment.id, 'con monto:', amountToPay);

    // Configurar la preferencia de MercadoPago
    const preference = {
      items: [
        {
          title: `${planName} - ${billingCycle}`,
          description: `Suscripción ${planName} (${billingCycle}) para ${subscription.business.name}`,
          unit_price: amountToPay,
          quantity: 1,
        }
      ],
      payer: {
        name: subscription.business.name,
        email: subscription.business.email
      },
      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" }
        ],
        installments: subscription.billingCycle === 'YEARLY' ? 12 : 6
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/subscription/success?payment=${payment.id}`,
        failure: `${process.env.FRONTEND_URL}/subscription/failure?payment=${payment.id}`,
        pending: `${process.env.FRONTEND_URL}/subscription/pending?payment=${payment.id}`
      },
      auto_return: "approved",
      external_reference: payment.id,
      notification_url: `${process.env.BACKEND_URL}/api/mercadopago/webhook`,
      metadata: {
        subscription_id: subscription.id,
        business_id: subscription.businessId,
        payment_id: payment.id,
        plan_type: subscription.planType,
        billing_cycle: subscription.billingCycle
      }
    };

    console.log('💳 Creando preferencia de MercadoPago:', {
      planType: subscription.planType,
      amount: amountToPay,
      billingCycle: subscription.billingCycle,
      businessName: subscription.business.name,
      hasPendingUpgrade: !!pendingUpgrade
    });

    // Crear la preferencia en MercadoPago (SDK v2)
    const prefClient = new Preference(mpClient);
    const response = await prefClient.create({ body: preference });

    // Actualizar el pago con el ID de preferencia
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        preferenceId: response.id,
        mercadoPagoOrderId: response.id
      }
    });

    console.log('✅ Preferencia creada exitosamente:', response.id);

    // Responder con los datos necesarios para el frontend
    res.json({
      success: true,
      data: {
        preferenceId: response.id,
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point,
        paymentId: payment.id,
        subscription: {
          id: subscription.id,
          planType: subscription.planType,
          billingCycle: subscription.billingCycle,
          amount: amountToPay
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creando preferencia de MercadoPago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Webhook para recibir notificaciones de MercadoPago
const handleWebhook = async (req, res) => {
  try {
    console.log('🔔 Webhook de MercadoPago recibido:', {
      type: req.body.type,
      data: req.body.data
    });

    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data.id;
      // Obtener información del pago desde MercadoPago (SDK v2)
      const paymentClient = new Payment(mpClient);
      const paymentInfo = await paymentClient.get({ id: paymentId });
      const paymentData = paymentInfo;

      console.log('💳 Información del pago recibida:', {
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

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: newStatus }
      });

      // Si el pago fue aprobado, verificar si es upgrade y procesarlo
      if (newStatus === 'APPROVED') {
        const pendingUpgrade = payment.subscription.metadata?.pendingUpgrade;
        
        if (pendingUpgrade && pendingUpgrade.paymentId === payment.id) {
          // Es un pago de upgrade, procesarlo con el servicio especializado
          console.log('🔄 Procesando upgrade pendiente:', {
            fromPlan: pendingUpgrade.fromPlan,
            toPlan: pendingUpgrade.toPlan,
            amount: pendingUpgrade.amount
          });
          
          const PlanChangeService = require('../services/planChangeService');
          await PlanChangeService.processUpgradePayment(payment.id);
          console.log('✅ Upgrade procesado exitosamente');
        } else {
          // Pago regular (nueva suscripción o renovación)
          console.log('💳 Procesando pago regular de suscripción');
          await prisma.subscription.update({
            where: { id: payment.subscription.id },
            data: { status: 'ACTIVE' }
          });
          await prisma.business.update({
            where: { id: payment.subscription.businessId },
            data: { planType: payment.subscription.planType }
          });
        }
      }

      res.json({ received: true });
    } else {
      res.json({ received: true });
    }
  } catch (error) {
    console.error('❌ Error en webhook de MercadoPago:', error);
    res.status(500).json({ success: false, message: 'Error en webhook' });
  }
};

// Verificar estado de un pago
const checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { user } = req;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: {
          include: { business: true }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    if (payment.subscription.businessId !== user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este pago'
      });
    }

    res.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          paidAt: payment.paidAt,
          paymentMethod: payment.paymentMethod,
          installments: payment.installments
        },
        subscription: {
          id: payment.subscription.id,
          status: payment.subscription.status,
          planType: payment.subscription.planType
        }
      }
    });

  } catch (error) {
    console.error('❌ Error verificando estado del pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  createSubscriptionPayment,
  handleWebhook,
  checkPaymentStatus,
  createAutomaticSubscription,
  handleSubscriptionWebhook
}; 