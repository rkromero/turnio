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

// TEMPORAL: Crear suscripción sin autenticación para debug
router.post('/create-temp', createSubscription);

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

router.post('/create', createSubscription);
router.get('/current', getCurrentSubscription);
router.post('/cancel', cancelSubscription);
router.get('/payments', getPaymentHistory);

module.exports = router; 