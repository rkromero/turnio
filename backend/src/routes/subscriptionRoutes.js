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

router.get('/plans', getPlansWithPricing);

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

router.post('/create', createSubscription);
router.get('/current', getCurrentSubscription);
router.post('/cancel', cancelSubscription);
router.get('/payments', getPaymentHistory);

module.exports = router; 