const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
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

// Rutas públicas
router.get('/plans', getPlansWithPricing);

// Rutas protegidas
router.post('/create-temp', authenticateToken, createSubscription);
router.get('/current', authenticateToken, getCurrentSubscription);
router.get('/:subscriptionId', authenticateToken, getCurrentSubscription);
router.post('/cancel', authenticateToken, cancelSubscription);
router.get('/payment-history', authenticateToken, getPaymentHistory);

// Cambio de plan
router.post('/change-plan', authenticateToken, changeSubscriptionPlan);
router.get('/plan-history', authenticateToken, getPlanChangeHistory);
router.get('/plan-change-history/:businessId', authenticateToken, getPlanChangeHistory);

// Pagos de cambio de plan
router.post('/process-upgrade-payment', authenticateToken, processUpgradePayment);
router.post('/process-downgrade-payment', authenticateToken, processDowngradePayment);

// Rutas de administración (solo admin) — BUG-03
router.post('/process-pending-downgrades', authenticateToken, requireAdmin, processPendingDowngrades);
router.post('/validate', authenticateToken, requireAdmin, runSubscriptionValidations);

module.exports = router; 