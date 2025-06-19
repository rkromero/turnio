const { prisma } = require('../config/database');

// MercadoPago SDK v2
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

// Instanciar cliente de MercadoPago
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

// Crear preferencia de pago para suscripción
const createSubscriptionPayment = async (req, res) => {
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

    // Configurar la preferencia de MercadoPago
    const preference = {
      items: [
        {
          title: `${planName} - ${billingCycle}`,
          description: `Suscripción ${planName} (${billingCycle}) para ${subscription.business.name}`,
          unit_price: subscription.priceAmount,
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
      amount: subscription.priceAmount,
      billingCycle: subscription.billingCycle,
      businessName: subscription.business.name
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
          amount: subscription.priceAmount
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

      // Si el pago fue aprobado, actualizar el plan del negocio
      if (newStatus === 'APPROVED') {
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
  checkPaymentStatus
}; 