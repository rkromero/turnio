const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
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

// Rutas protegidas
router.post('/create-temp', authenticateToken, createSubscription);
router.get('/current', authenticateToken, getCurrentSubscription);
router.get('/:subscriptionId', authenticateToken, getCurrentSubscription);
router.post('/cancel', authenticateToken, cancelSubscription);
router.get('/payment-history', authenticateToken, getPaymentHistory);

// Nuevas rutas para cambio de plan
router.post('/change-plan', authenticateToken, changeSubscriptionPlan);
router.get('/plan-history', authenticateToken, getPlanChangeHistory);
router.get('/plan-change-history/:businessId', authenticateToken, getPlanChangeHistory);

// Nuevas rutas para procesar pagos de cambio de plan
router.post('/process-upgrade-payment', authenticateToken, processUpgradePayment);
router.post('/process-downgrade-payment', authenticateToken, processDowngradePayment);
router.post('/process-pending-downgrades', authenticateToken, processPendingDowngrades);

// Ruta de administración (solo admin)
router.post('/validate', authenticateToken, runSubscriptionValidations);

module.exports = router; 