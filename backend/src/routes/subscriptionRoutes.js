const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getPlansWithPricing,
  createSubscription,
  getCurrentSubscription,
  cancelSubscription,
  getPaymentHistory
} = require('../controllers/subscriptionController');

// Rutas públicas (sin autenticación)
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Subscription routes working!' });
});

// Endpoint de prueba simple para planes
router.get('/test-plans', (req, res) => {
  try {
    console.log('🧪 Test plans endpoint called');
    res.json({
      success: true,
      message: 'Test plans endpoint working',
      timestamp: new Date().toISOString(),
      data: {
        plans: [
          { key: 'FREE', name: 'Plan Gratuito', price: 0 },
          { key: 'BASIC', name: 'Plan Básico', price: 4900 },
          { key: 'PREMIUM', name: 'Plan Premium', price: 9900 },
          { key: 'ENTERPRISE', name: 'Plan Empresa', price: 14900 }
        ]
      }
    });
  } catch (error) {
    console.error('❌ Error in test plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error in test plans',
      error: error.message
    });
  }
});

router.get('/plans', getPlansWithPricing);

// Test endpoint para verificar conexión a BD
router.get('/test-db', async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Test simple query
    const businessCount = await prisma.business.count();
    console.log('✅ Business count:', businessCount);
    
    // Test if subscription table exists
    try {
      const subscriptionCount = await prisma.subscription.count();
      console.log('✅ Subscription table exists, count:', subscriptionCount);
    } catch (subError) {
      console.error('❌ Subscription table error:', subError.message);
      return res.json({
        success: false,
        message: 'Subscription table not found',
        error: subError.message,
        businessCount
      });
    }
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      message: 'Database connection OK',
      businessCount,
      subscriptionCount: await prisma.subscription.count()
    });
  } catch (error) {
    console.error('❌ Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// TEMPORAL: Crear suscripción sin autenticación para debug
router.post('/create-temp', createSubscription);

// TEMPORAL: Endpoint de debug para crear suscripción
router.post('/debug-create', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Iniciando debug-create...');
    console.log('🔍 DEBUG: req.body:', req.body);
    
    const { businessId, planType, billingCycle = 'MONTHLY' } = req.body;
    
    // Verificar que tenemos los datos necesarios
    if (!businessId || !planType) {
      return res.status(400).json({
        success: false,
        message: 'businessId y planType son requeridos',
        received: { businessId, planType, billingCycle }
      });
    }

    // Verificar que el negocio existe
    const { prisma } = require('../config/database');
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado',
        businessId
      });
    }

    // Verificar que el plan es válido
    const AVAILABLE_PLANS = {
      FREE: { name: 'Plan Gratuito', price: 0 },
      BASIC: { name: 'Plan Básico', price: 4900 },
      PREMIUM: { name: 'Plan Premium', price: 9900 },
      ENTERPRISE: { name: 'Plan Empresa', price: 14900 }
    };

    if (!AVAILABLE_PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: 'Plan no válido',
        planType,
        availablePlans: Object.keys(AVAILABLE_PLANS)
      });
    }

    // Intentar crear la suscripción
    const plan = AVAILABLE_PLANS[planType];
    let priceAmount = plan.price;
    
    if (billingCycle === 'YEARLY' && priceAmount > 0) {
      priceAmount = Math.round(priceAmount * 12 * 0.9);
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

    console.log('🔍 DEBUG: Intentando crear suscripción con datos:', {
      businessId,
      planType,
      billingCycle,
      priceAmount,
      startDate,
      nextBillingDate
    });

    const subscription = await prisma.subscription.create({
      data: {
        businessId,
        planType,
        billingCycle,
        priceAmount,
        startDate,
        nextBillingDate,
        status: planType === 'FREE' ? 'ACTIVE' : 'PENDING'
      }
    });

    console.log('🔍 DEBUG: Suscripción creada exitosamente:', subscription.id);

    // Actualizar el negocio
    await prisma.business.update({
      where: { id: businessId },
      data: { planType }
    });

    res.json({
      success: true,
      message: 'Suscripción creada en modo debug',
      data: {
        subscription,
        requiresPayment: priceAmount > 0
      }
    });

  } catch (error) {
    console.error('❌ DEBUG: Error en debug-create:', error);
    res.status(500).json({
      success: false,
      message: 'Error en debug-create',
      error: error.message,
      stack: error.stack
    });
  }
});

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

router.post('/create', createSubscription);
router.get('/current', getCurrentSubscription);
router.post('/cancel', cancelSubscription);
router.get('/payments', getPaymentHistory);

module.exports = router; 