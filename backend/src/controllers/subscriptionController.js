const { prisma } = require('../config/database');
const SubscriptionValidationService = require('../services/subscriptionValidationService');
const PlanChangeService = require('../services/planChangeService');

// Definición de planes disponibles (copiado desde planController)
const AVAILABLE_PLANS = {
  FREE: {
    name: 'Plan Gratuito',
    description: 'Perfecto para empezar',
    price: 0,
    limits: {
      appointments: 30,
      services: 3,
      users: 1
    },
    features: [
      'Hasta 30 citas por mes',
      'Hasta 3 servicios',
      '1 usuario/empleado',
      'Reservas públicas',
      'Dashboard básico'
    ]
  },
  BASIC: {
    name: 'Plan Básico',
    description: 'Ideal para profesionales individuales',
    price: 100,
    limits: {
      appointments: 100,
      services: 10,
      users: 3
    },
    features: [
      'Hasta 100 citas por mes',
      'Hasta 10 servicios',
      'Hasta 3 usuarios/empleados',
      'Reservas públicas',
      'Dashboard completo',
      'Recordatorios por email',
      'Reportes básicos'
    ]
  },
  PREMIUM: {
    name: 'Plan Premium',
    description: 'Para equipos y consultorios',
    price: 101,
    limits: {
      appointments: 500,
      services: 25,
      users: 10
    },
    features: [
      'Hasta 500 citas por mes',
      'Hasta 25 servicios',
      'Hasta 10 usuarios/empleados',
      'Reservas públicas',
      'Dashboard avanzado',
      'Recordatorios por email y SMS',
      'Reportes avanzados',
      'Personalización de marca'
    ]
  },
  ENTERPRISE: {
    name: 'Plan Empresa',
    description: 'Para empresas y clínicas',
    price: 102,
    limits: {
      appointments: -1, // Ilimitado
      services: -1,     // Ilimitado
      users: -1         // Ilimitado
    },
    features: [
      'Citas ilimitadas',
      'Servicios ilimitados',
      'Usuarios/empleados ilimitados',
      'Reservas públicas',
      'Dashboard avanzado',
      'Recordatorios por email y SMS',
      'Reportes completos',
      'Personalización completa de marca',
      'Soporte prioritario 24/7'
    ]
  }
};

// Obtener planes con precios mensuales y anuales
const getPlansWithPricing = async (req, res) => {
  try {
    console.log('📋 Obteniendo planes con precios...');
    
    // Verificar que AVAILABLE_PLANS esté definido
    if (!AVAILABLE_PLANS) {
      console.error('❌ AVAILABLE_PLANS no está definido');
      return res.status(500).json({
        success: false,
        message: 'Planes no disponibles'
      });
    }

    console.log('📋 AVAILABLE_PLANS keys:', Object.keys(AVAILABLE_PLANS));
    
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

    console.log(`✅ Devolviendo ${plansWithPricing.length} planes`);

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
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear suscripción (después del registro)
const createSubscription = async (req, res) => {
  try {
    console.log('🔍 createSubscription - Iniciando...');
    console.log('🔍 req.body:', req.body);
    console.log('🔍 req.user:', req.user);
    console.log('🔍 req.cookies:', req.cookies);
    console.log('🔍 req.path:', req.path);
    
    const { businessId, planType, billingCycle = 'MONTHLY' } = req.body;
    console.log('🔍 Datos extraídos:', { businessId, planType, billingCycle });

    // Verificar que el plan sea válido
    console.log('🔍 Verificando plan válido...');
    console.log('🔍 AVAILABLE_PLANS keys:', Object.keys(AVAILABLE_PLANS));
    console.log('🔍 planType recibido:', planType);
    
    if (!AVAILABLE_PLANS[planType]) {
      console.log('❌ Plan no válido:', planType);
      return res.status(400).json({
        success: false,
        message: 'Plan no válido'
      });
    }
    console.log('✅ Plan válido confirmado');

    // Verificar que el negocio existe
    console.log('🔍 Buscando negocio con ID:', businessId);
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { subscription: true }
    });
    console.log('🔍 Negocio encontrado:', business ? 'SÍ' : 'NO');

    if (!business) {
      console.log('❌ Negocio no encontrado con ID:', businessId);
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }
    console.log('✅ Negocio encontrado:', business.name);

    // Verificar permisos solo si hay usuario autenticado
    if (req.user) {
      if (req.user.businessId !== businessId) {
        console.log('❌ Usuario no tiene permisos para este negocio');
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para este negocio'
        });
      }
    }

    // Verificar si ya tiene suscripción activa (solo bloquear si es plan de pago)
    if (business.subscription && 
        business.subscription.status === 'ACTIVE' && 
        business.subscription.planType !== 'FREE') {
      console.log('❌ Ya tiene suscripción de pago activa:', business.subscription.planType);
      return res.status(400).json({
        success: false,
        message: `Ya tienes una suscripción ${business.subscription.planType} activa`
      });
    }
    
    // Si tiene suscripción FREE, permitir upgrade
    if (business.subscription && business.subscription.planType === 'FREE') {
      console.log('✅ Actualizando desde plan FREE a:', planType);
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

    // Crear o actualizar suscripción
    let subscription;
    
    if (business.subscription) {
      // Actualizar suscripción existente
      console.log('🔍 Actualizando suscripción existente con datos:', {
        planType,
        billingCycle,
        priceAmount,
        nextBillingDate,
        status: planType === 'FREE' ? 'ACTIVE' : 'PAYMENT_FAILED'
      });
      
      subscription = await prisma.subscription.update({
        where: { id: business.subscription.id },
        data: {
          planType,
          billingCycle,
          priceAmount,
          currency: 'ARS',
          nextBillingDate,
          status: planType === 'FREE' ? 'ACTIVE' : 'PAYMENT_FAILED',
          updatedAt: new Date()
        }
      });
      console.log('✅ Suscripción actualizada exitosamente:', subscription.id);
    } else {
      // Crear nueva suscripción
      console.log('🔍 Creando nueva suscripción con datos:', {
        businessId,
        planType,
        billingCycle,
        priceAmount,
        startDate,
        nextBillingDate,
        status: planType === 'FREE' ? 'ACTIVE' : 'PAYMENT_FAILED'
      });
      
      subscription = await prisma.subscription.create({
        data: {
          businessId,
          planType,
          billingCycle,
          priceAmount,
          currency: 'ARS',
          startDate,
          nextBillingDate,
          status: planType === 'FREE' ? 'ACTIVE' : 'PAYMENT_FAILED'
        }
      });
      console.log('✅ Suscripción creada exitosamente:', subscription.id);
    }

    // Solo actualizar el plan del negocio si es FREE (no requiere pago)
    // Para planes de pago, actualizar DESPUÉS de procesar el pago exitosamente
    if (planType === 'FREE') {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          planType,
          maxAppointments: plan.limits.appointments === -1 ? 999999 : plan.limits.appointments
        }
      });
      console.log(`✅ Plan ${planType} actualizado inmediatamente (sin pago requerido)`);
    } else {
      console.log(`⏳ Plan ${planType} pendiente de pago - negocio mantiene plan actual hasta completar pago`);
    }

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
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

// Endpoint para ejecutar validaciones de suscripción (solo admin)
const runSubscriptionValidations = async (req, res) => {
  try {
    console.log('🔍 Ejecutando validaciones de suscripción...');
    
    const results = await SubscriptionValidationService.runAllValidations();
    
    res.json({
      success: true,
      message: 'Validaciones ejecutadas correctamente',
      data: results
    });
    
  } catch (error) {
    console.error('❌ Error ejecutando validaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando validaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Endpoint para cambiar de plan (maneja usuarios con y sin suscripción)
const changeSubscriptionPlan = async (req, res) => {
  try {
    const { subscriptionId, newPlanType } = req.body;
    const { user } = req;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    if (!newPlanType) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere newPlanType'
      });
    }

    console.log(`🔄 Usuario ${user.email} solicitando cambio de plan a: ${newPlanType}`);
    console.log(`📋 Datos recibidos:`, { subscriptionId, newPlanType, businessId: user.businessId });

    // Si no hay subscriptionId, es un usuario en plan gratuito que quiere crear suscripción
    if (!subscriptionId) {
      console.log('📝 Usuario sin suscripción, creando nueva suscripción...');
      
      // Verificar que el negocio existe y está en plan gratuito
      const business = await prisma.business.findUnique({
        where: { id: user.businessId },
        include: { subscription: true }
      });

      if (!business) {
        console.log('❌ Negocio no encontrado:', user.businessId);
        return res.status(404).json({
          success: false,
          message: 'Negocio no encontrado'
        });
      }

      console.log(`🏢 Negocio encontrado: ${business.name}, plan actual: ${business.planType}`);
      console.log(`🔍 Suscripción existente:`, business.subscription ? 'SÍ' : 'NO');

      if (business.subscription) {
        console.log('❌ Ya tiene suscripción activa:', business.subscription.id);
        return res.status(400).json({
          success: false,
          message: 'Ya tienes una suscripción activa. Usa el endpoint de cambio de plan.'
        });
      }

      // Verificar que el plan sea válido
      console.log(`🔍 Verificando si plan '${newPlanType}' existe en AVAILABLE_PLANS:`, Object.keys(AVAILABLE_PLANS));
      if (!AVAILABLE_PLANS[newPlanType]) {
        console.log(`❌ Plan '${newPlanType}' no válido. Planes disponibles:`, Object.keys(AVAILABLE_PLANS));
        return res.status(400).json({
          success: false,
          message: `Plan no válido: ${newPlanType}. Planes disponibles: ${Object.keys(AVAILABLE_PLANS).join(', ')}`
        });
      }

      const plan = AVAILABLE_PLANS[newPlanType];
      let priceAmount = plan.price;
      const billingCycle = 'MONTHLY';
      
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

      // Crear nueva suscripción
      console.log('🔍 Creando nueva suscripción con datos:', {
        businessId: user.businessId,
        planType: newPlanType,
        billingCycle,
        priceAmount,
        startDate,
        nextBillingDate,
        status: newPlanType === 'FREE' ? 'ACTIVE' : 'PAYMENT_FAILED'
      });
      
      const subscription = await prisma.subscription.create({
        data: {
          businessId: user.businessId,
          planType: newPlanType,
          billingCycle,
          priceAmount,
          currency: 'ARS',
          startDate,
          nextBillingDate,
          status: newPlanType === 'FREE' ? 'ACTIVE' : 'PAYMENT_FAILED'
        }
      });
      console.log('✅ Suscripción creada exitosamente:', subscription.id);

      // Solo actualizar el plan del negocio si es FREE (no requiere pago)
      if (newPlanType === 'FREE') {
        await prisma.business.update({
          where: { id: user.businessId },
          data: {
            planType: newPlanType,
            maxAppointments: plan.limits.appointments === -1 ? 999999 : plan.limits.appointments
          }
        });
        console.log(`✅ Plan ${newPlanType} actualizado inmediatamente (sin pago requerido)`);
      } else {
        console.log(`⏳ Plan ${newPlanType} pendiente de pago - negocio mantiene plan actual hasta completar pago`);
      }

      return res.json({
        success: true,
        message: 'Suscripción creada exitosamente',
        data: {
          subscription,
          requiresPayment: priceAmount > 0
        }
      });
    }

    // Usuario con suscripción existente
    console.log(`🔄 Usuario con suscripción existente: ${subscriptionId} → ${newPlanType}`);

    const result = await PlanChangeService.changeSubscriptionPlan(
      subscriptionId, 
      newPlanType, 
      user.businessId
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        requiresPayment: result.requiresPayment,
        paymentId: result.paymentId,
        amount: result.amount,
        changeType: result.changeType,
        effectiveDate: result.effectiveDate
      }
    });

  } catch (error) {
    console.error('❌ Error cambiando plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Endpoint para obtener historial de cambios de plan
const getPlanChangeHistory = async (req, res) => {
  try {
    const { user } = req;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const history = await PlanChangeService.getPlanChangeHistory(user.businessId);

    res.json({
      success: true,
      data: {
        history: history
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Endpoint para procesar pago de upgrade
const processUpgradePayment = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const { user } = req;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere paymentId'
      });
    }

    console.log(`💳 Procesando pago de upgrade: ${paymentId}`);

    const result = await PlanChangeService.processUpgradePayment(paymentId);

    res.json({
      success: true,
      message: result.message,
      data: {
        fromPlan: result.fromPlan,
        toPlan: result.toPlan,
        newBillingDate: result.newBillingDate
      }
    });

  } catch (error) {
    console.error('❌ Error procesando pago de upgrade:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Endpoint para procesar pago de downgrade
const processDowngradePayment = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const { user } = req;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere paymentId'
      });
    }

    console.log(`💳 Procesando pago de downgrade: ${paymentId}`);

    const result = await PlanChangeService.processDowngradePayment(paymentId);

    res.json({
      success: true,
      message: result.message,
      data: {
        fromPlan: result.fromPlan,
        toPlan: result.toPlan
      }
    });

  } catch (error) {
    console.error('❌ Error procesando pago de downgrade:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Endpoint para procesar downgrades pendientes
const processPendingDowngrades = async (req, res) => {
  try {
    const { user } = req;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    console.log('🔍 Procesando downgrades pendientes...');

    const processedCount = await PlanChangeService.processPendingDowngrades();

    res.json({
      success: true,
      message: `Procesados ${processedCount} downgrades pendientes`,
      data: {
        processedCount: processedCount
      }
    });

  } catch (error) {
    console.error('❌ Error procesando downgrades pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getPlansWithPricing,
  createSubscription,
  getCurrentSubscription,
  cancelSubscription,
  getPaymentHistory,
  runSubscriptionValidations,
  changeSubscriptionPlan,
  getPlanChangeHistory,
  processUpgradePayment,
  processDowngradePayment,
  processPendingDowngrades
}; 