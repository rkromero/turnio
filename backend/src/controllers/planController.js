const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');

// Definición de planes disponibles
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
    price: 4900,
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
    price: 9900,
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
    price: 14900,
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

// Obtener planes disponibles
const getAvailablePlans = async (req, res) => {
  try {
    const businessId = req.businessId;

    // Obtener el plan actual del negocio
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { planType: true }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    // Agregar información del plan actual a cada plan
    const plansWithCurrentInfo = Object.entries(AVAILABLE_PLANS).map(([key, plan]) => ({
      key,
      ...plan,
      isCurrent: business.planType === key
    }));

    res.json({
      success: true,
      data: {
        currentPlan: business.planType,
        plans: plansWithCurrentInfo
      }
    });

  } catch (error) {
    console.error('Error obteniendo planes disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cambiar plan del negocio
const changePlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const businessId = req.businessId;
    const { newPlan } = req.body;

    // Verificar que el plan sea válido
    if (!AVAILABLE_PLANS[newPlan]) {
      return res.status(400).json({
        success: false,
        message: 'Plan no válido'
      });
    }

    // Obtener el negocio actual
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { planType: true, name: true }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    // Si es el mismo plan, no hacer nada
    if (business.planType === newPlan) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes este plan activo'
      });
    }

    // Validar que el cambio de plan no exceda los límites actuales
    const newPlanLimits = AVAILABLE_PLANS[newPlan].limits;
    
    // Contar recursos actuales
    const [currentUsers, currentServices] = await Promise.all([
      prisma.user.count({
        where: { businessId, isActive: true }
      }),
      prisma.service.count({
        where: { businessId, isActive: true }
      })
    ]);

    // Verificar límites del nuevo plan
    const limitsExceeded = [];
    
    if (newPlanLimits.users !== -1 && currentUsers > newPlanLimits.users) {
      limitsExceeded.push(`usuarios (tienes ${currentUsers}, el plan permite ${newPlanLimits.users})`);
    }
    
    if (newPlanLimits.services !== -1 && currentServices > newPlanLimits.services) {
      limitsExceeded.push(`servicios (tienes ${currentServices}, el plan permite ${newPlanLimits.services})`);
    }

    if (limitsExceeded.length > 0) {
      return res.status(400).json({
        success: false,
        message: `No puedes cambiar a este plan porque excedes los límites en: ${limitsExceeded.join(', ')}`
      });
    }

    // Si es plan FREE, cambiar directamente
    if (newPlan === 'FREE') {
      const updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: {
          planType: newPlan,
          maxAppointments: newPlanLimits.appointments === -1 ? 999999 : newPlanLimits.appointments
        },
        select: {
          id: true,
          name: true,
          planType: true,
          maxAppointments: true
        }
      });

      console.log(`✅ Plan cambiado: ${business.planType} → ${newPlan} para negocio ${business.name}`);

      res.json({
        success: true,
        message: `Plan actualizado exitosamente a ${AVAILABLE_PLANS[newPlan].name}`,
        data: {
          business: updatedBusiness,
          newPlan: AVAILABLE_PLANS[newPlan]
        }
      });
    } else {
      // Para planes pagados, redirigir al flujo de suscripción
      console.log(`⏳ Plan ${newPlan} requiere pago - redirigiendo al flujo de suscripción`);
      
      res.json({
        success: true,
        requiresPayment: true,
        message: `Para cambiar al plan ${AVAILABLE_PLANS[newPlan].name} necesitas completar el pago`,
        data: {
          newPlan: AVAILABLE_PLANS[newPlan],
          redirectTo: '/dashboard/plans',
          action: 'create_subscription'
        }
      });
    }

  } catch (error) {
    console.error('Error cambiando plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener información detallada del plan actual
const getCurrentPlanInfo = async (req, res) => {
  try {
    const businessId = req.businessId;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { planType: true, maxAppointments: true }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    const planInfo = AVAILABLE_PLANS[business.planType];

    res.json({
      success: true,
      data: {
        ...planInfo,
        key: business.planType,
        maxAppointments: business.maxAppointments
      }
    });

  } catch (error) {
    console.error('Error obteniendo información del plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getAvailablePlans,
  changePlan,
  getCurrentPlanInfo,
  AVAILABLE_PLANS
}; 