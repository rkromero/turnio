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

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

router.post('/create', createSubscription);
router.get('/current', getCurrentSubscription);
router.post('/cancel', cancelSubscription);
router.get('/payments', getPaymentHistory);

module.exports = router; 