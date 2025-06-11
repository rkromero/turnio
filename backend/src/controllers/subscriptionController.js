const { PrismaClient } = require('@prisma/client');
const { AVAILABLE_PLANS } = require('./planController');

const prisma = new PrismaClient();

// Obtener planes con precios mensuales y anuales
const getPlansWithPricing = async (req, res) => {
  try {
    // Calcular precios anuales con 10% descuento
    const plansWithPricing = Object.entries(AVAILABLE_PLANS).map(([key, plan]) => {
      const monthlyPrice = plan.price;
      const yearlyPrice = monthlyPrice > 0 ? Math.round(monthlyPrice * 12 * 0.9) : 0; // 10% descuento
      const yearlyMonthlyEquivalent = yearlyPrice > 0 ? Math.round(yearlyPrice / 12) : 0;
      
      return {
        key,
        ...plan,
        pricing: {
          monthly: {
            price: monthlyPrice,
            displayPrice: monthlyPrice,
            cycle: 'monthly'
          },
          yearly: {
            price: yearlyPrice,
            displayPrice: yearlyMonthlyEquivalent,
            totalPrice: yearlyPrice,
            savings: monthlyPrice > 0 ? Math.round((monthlyPrice * 12) - yearlyPrice) : 0,
            savingsPercentage: 10,
            cycle: 'yearly'
          }
        }
      };
    });

    res.json({
      success: true,
      data: {
        plans: plansWithPricing,
        currency: 'ARS'
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo planes con precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear suscripción (después del registro)
const createSubscription = async (req, res) => {
  try {
    const { businessId, planType, billingCycle = 'MONTHLY' } = req.body;

    // Verificar que el plan sea válido
    if (!AVAILABLE_PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: 'Plan no válido'
      });
    }

    // Verificar que el negocio existe
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { subscription: true }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    // Verificar si ya tiene suscripción activa
    if (business.subscription && business.subscription.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una suscripción activa'
      });
    }

    const plan = AVAILABLE_PLANS[planType];
    let priceAmount = plan.price;
    
    // Aplicar descuento anual
    if (billingCycle === 'YEARLY' && priceAmount > 0) {
      priceAmount = Math.round(priceAmount * 12 * 0.9); // 10% descuento
    }

    const startDate = new Date();
    let nextBillingDate = null;
    
    if (priceAmount > 0) {
      nextBillingDate = new Date(startDate);
      if (billingCycle === 'MONTHLY') {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }
    }

    // Crear suscripción
    const subscription = await prisma.subscription.create({
      data: {
        businessId,
        planType,
        billingCycle,
        priceAmount,
        startDate,
        nextBillingDate,
        status: planType === 'FREE' ? 'ACTIVE' : 'PENDING' // FREE es activa inmediatamente
      }
    });

    // Actualizar el plan del negocio
    await prisma.business.update({
      where: { id: businessId },
      data: {
        planType,
        maxAppointments: plan.limits.appointments === -1 ? 999999 : plan.limits.appointments
      }
    });

    console.log(`✅ Suscripción creada: ${planType} (${billingCycle}) para negocio ${business.name}`);

    res.json({
      success: true,
      data: {
        subscription,
        requiresPayment: priceAmount > 0
      }
    });

  } catch (error) {
    console.error('❌ Error creando suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener suscripción actual
const getCurrentSubscription = async (req, res) => {
  try {
    const { user } = req;
    
    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      include: {
        subscription: {
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 5 // Últimos 5 pagos
            }
          }
        }
      }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    // Información del plan actual
    const currentPlan = AVAILABLE_PLANS[business.planType];
    
    res.json({
      success: true,
      data: {
        business: {
          id: business.id,
          name: business.name,
          planType: business.planType
        },
        currentPlan,
        subscription: business.subscription,
        recentPayments: business.subscription?.payments || []
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo suscripción actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cancelar suscripción
const cancelSubscription = async (req, res) => {
  try {
    const { user } = req;
    const { reason } = req.body;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      include: { subscription: true }
    });

    if (!business || !business.subscription) {
      return res.status(404).json({
        success: false,
        message: 'No tienes una suscripción activa'
      });
    }

    if (business.subscription.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'La suscripción ya está cancelada o inactiva'
      });
    }

    const now = new Date();

    // Actualizar suscripción
    const updatedSubscription = await prisma.subscription.update({
      where: { id: business.subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        metadata: {
          ...business.subscription.metadata,
          cancellationReason: reason || 'No especificado',
          cancelledBy: user.id
        }
      }
    });

    // Cambiar a plan gratuito
    await prisma.business.update({
      where: { id: user.businessId },
      data: {
        planType: 'FREE',
        maxAppointments: 30
      }
    });

    // Registrar cambio de plan
    await prisma.planChange.create({
      data: {
        businessId: user.businessId,
        fromPlan: business.planType,
        toPlan: 'FREE',
        changeReason: 'subscription_cancelled',
        effectiveDate: now
      }
    });

    console.log(`🚫 Suscripción cancelada para negocio ${business.name} - Razón: ${reason}`);

    res.json({
      success: true,
      message: 'Suscripción cancelada exitosamente. Has sido cambiado al plan gratuito.',
      data: {
        subscription: updatedSubscription,
        newPlan: 'FREE'
      }
    });

  } catch (error) {
    console.error('❌ Error cancelando suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener historial de pagos
const getPaymentHistory = async (req, res) => {
  try {
    const { user } = req;
    const { page = 1, limit = 10 } = req.query;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { businessId: user.businessId }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No tienes suscripción'
      });
    }

    const payments = await prisma.payment.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const totalPayments = await prisma.payment.count({
      where: { subscriptionId: subscription.id }
    });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalPayments,
          totalPages: Math.ceil(totalPayments / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial de pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getPlansWithPricing,
  createSubscription,
  getCurrentSubscription,
  cancelSubscription,
  getPaymentHistory
}; 