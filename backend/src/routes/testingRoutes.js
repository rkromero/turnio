const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { prisma } = require('../config/database');
const { checkExpiredSubscriptions } = require('../controllers/subscriptionAutoController');

// Endpoint para modificar fecha de suscripción (solo para testing)
router.post('/subscription/modify-date', authenticateJWT, async (req, res) => {
  try {
    const { subscriptionId, action } = req.body;
    const { user } = req;

    console.log('🧪 [TESTING] Modificando fecha de suscripción:', { subscriptionId, action });

    // Verificar que el usuario tiene permisos sobre la suscripción
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

    let newDate;
    let statusUpdate = {};

    switch (action) {
      case 'simulate_expiry':
        // Simular que la suscripción venció ayer
        newDate = new Date();
        newDate.setDate(newDate.getDate() - 1);
        newDate.setHours(12, 0, 0, 0);
        break;
      
      case 'simulate_future':
        // Simular fecha futura (30 días)
        newDate = new Date();
        newDate.setDate(newDate.getDate() + 30);
        break;
      
      case 'simulate_overdue':
        // Simular suscripción muy vencida (7 días atrás)
        newDate = new Date();
        newDate.setDate(newDate.getDate() - 7);
        statusUpdate.status = 'PAYMENT_FAILED';
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Acción no válida. Usa: simulate_expiry, simulate_future, simulate_overdue'
        });
    }

    // Actualizar la suscripción
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        nextBillingDate: newDate,
        ...statusUpdate
      }
    });

    console.log('✅ [TESTING] Fecha modificada exitosamente');

    res.json({
      success: true,
      message: 'Fecha de suscripción modificada para testing',
      data: {
        subscriptionId: subscription.id,
        businessName: subscription.business.name,
        previousDate: subscription.nextBillingDate,
        newDate: newDate,
        action: action,
        status: updatedSubscription.status
      }
    });

  } catch (error) {
    console.error('❌ [TESTING] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error modificando fecha de suscripción',
      error: error.message
    });
  }
});

// Endpoint para ejecutar verificación de suscripciones vencidas manualmente
router.post('/subscription/check-expired', authenticateJWT, async (req, res) => {
  try {
    console.log('🧪 [TESTING] Ejecutando verificación manual de suscripciones vencidas...');

    // Ejecutar la verificación
    await checkExpiredSubscriptions();

    // Obtener estadísticas después de la verificación
    const stats = await prisma.subscription.groupBy({
      by: ['status'],
      _count: {
        status: true
      },
      where: {
        planType: { not: 'FREE' }
      }
    });

    console.log('✅ [TESTING] Verificación completada');

    res.json({
      success: true,
      message: 'Verificación de suscripciones vencidas ejecutada',
      data: {
        timestamp: new Date().toISOString(),
        statistics: stats
      }
    });

  } catch (error) {
    console.error('❌ [TESTING] Error en verificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando verificación',
      error: error.message
    });
  }
});

// Endpoint para obtener información detallada de una suscripción
router.get('/subscription/:id/details', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        business: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
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

    // Calcular información adicional
    const now = new Date();
    const daysUntilExpiry = subscription.nextBillingDate ? 
      Math.ceil((new Date(subscription.nextBillingDate) - now) / (1000 * 60 * 60 * 24)) : null;

    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          planType: subscription.planType,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          priceAmount: subscription.priceAmount,
          nextBillingDate: subscription.nextBillingDate,
          daysUntilExpiry,
          isExpired: daysUntilExpiry ? daysUntilExpiry < 0 : false
        },
        business: {
          name: subscription.business.name,
          email: subscription.business.email
        },
        recentPayments: subscription.payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          createdAt: payment.createdAt,
          paidAt: payment.paidAt
        }))
      }
    });

  } catch (error) {
    console.error('❌ [TESTING] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo detalles de suscripción',
      error: error.message
    });
  }
});

// Endpoint para restaurar fechas de suscripción
router.post('/subscription/restore-date', authenticateJWT, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const { user } = req;

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

    // Calcular nueva fecha (30 días desde hoy)
    const newDate = new Date();
    if (subscription.billingCycle === 'MONTHLY') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }

    // Restaurar la suscripción
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        nextBillingDate: newDate,
        status: 'ACTIVE'
      }
    });

    console.log('✅ [TESTING] Fecha restaurada exitosamente');

    res.json({
      success: true,
      message: 'Fecha de suscripción restaurada',
      data: {
        subscriptionId: subscription.id,
        businessName: subscription.business.name,
        previousDate: subscription.nextBillingDate,
        newDate: newDate,
        status: updatedSubscription.status
      }
    });

  } catch (error) {
    console.error('❌ [TESTING] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error restaurando fecha de suscripción',
      error: error.message
    });
  }
});

module.exports = router; 