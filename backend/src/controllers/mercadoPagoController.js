const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuración de MercadoPago
const mercadopago = require('mercadopago');

// Configurar con las credenciales (se configurará desde variables de entorno)
if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
  });
}

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
          { id: "ticket" } // Excluir pagos en efectivo
        ],
        installments: subscription.billingCycle === 'YEARLY' ? 12 : 6 // Permitir cuotas
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/subscription/success?payment=${payment.id}`,
        failure: `${process.env.FRONTEND_URL}/subscription/failure?payment=${payment.id}`,
        pending: `${process.env.FRONTEND_URL}/subscription/pending?payment=${payment.id}`
      },
      auto_return: "approved",
      external_reference: payment.id, // Nuestro ID interno
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

    // Crear la preferencia en MercadoPago
    const response = await mercadopago.preferences.create(preference);

    // Actualizar el pago con el ID de preferencia
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        preferenceId: response.body.id,
        mercadoPagoOrderId: response.body.id
      }
    });

    console.log('✅ Preferencia creada exitosamente:', response.body.id);

    // Responder con los datos necesarios para el frontend
    res.json({
      success: true,
      data: {
        preferenceId: response.body.id,
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY,
        initPoint: response.body.init_point,
        sandboxInitPoint: response.body.sandbox_init_point,
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
      
      // Obtener información del pago desde MercadoPago
      const paymentInfo = await mercadopago.payment.findById(paymentId);
      const paymentData = paymentInfo.body;

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
        case 'refunded':
          newStatus = 'REFUNDED';
          break;
        case 'pending':
        case 'in_process':
        case 'in_mediation':
          newStatus = 'PENDING';
          break;
      }

      // Actualizar el pago
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          mercadoPagoPaymentId: paymentData.id.toString(),
          paidAt: newStatus === 'APPROVED' ? new Date() : null,
          paymentMethod: paymentData.payment_method_id,
          installments: paymentData.installments,
          failureReason: newStatus === 'REJECTED' ? paymentData.status_detail : null
        }
      });

      // Si el pago fue aprobado, activar la suscripción
      if (newStatus === 'APPROVED') {
        console.log('✅ Pago aprobado, activando suscripción...');
        
        await prisma.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            status: 'ACTIVE',
            mercadoPagoPaymentId: paymentData.id.toString()
          }
        });

        // Registrar el cambio de plan si es necesario
        if (payment.subscription.business.planType !== payment.subscription.planType) {
          await prisma.planChange.create({
            data: {
              businessId: payment.subscription.businessId,
              fromPlan: payment.subscription.business.planType,
              toPlan: payment.subscription.planType,
              changeReason: 'payment_approved',
              effectiveDate: new Date()
            }
          });

          // Actualizar el plan del negocio
          const planLimits = {
            'FREE': { appointments: 30 },
            'BASIC': { appointments: 100 },
            'PREMIUM': { appointments: 500 },
            'ENTERPRISE': { appointments: 999999 }
          };

          await prisma.business.update({
            where: { id: payment.subscription.businessId },
            data: {
              planType: payment.subscription.planType,
              maxAppointments: planLimits[payment.subscription.planType]?.appointments || 30
            }
          });
        }

        console.log(`🎉 Suscripción activada: ${payment.subscription.planType} para ${payment.subscription.business.name}`);
      } else if (newStatus === 'REJECTED') {
        console.log('❌ Pago rechazado, marcando suscripción como fallida...');
        
        await prisma.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            status: 'PAYMENT_FAILED'
          }
        });
      }

      console.log(`📊 Pago actualizado: ${payment.id} -> ${newStatus}`);
    }

    // Responder OK a MercadoPago
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Error procesando webhook de MercadoPago:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing webhook',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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