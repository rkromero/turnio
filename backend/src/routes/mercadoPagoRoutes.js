const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createSubscriptionPayment,
  handleWebhook,
  checkPaymentStatus
} = require('../controllers/mercadoPagoController');
const { createAutomaticSubscription, handleSubscriptionWebhook } = require('../controllers/subscriptionAutoController');

// Rutas públicas (webhooks)
router.post('/webhook', handleWebhook);
router.post('/subscription-webhook', handleSubscriptionWebhook);

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

router.post('/create-payment', createSubscriptionPayment);
router.post('/create-automatic-subscription', createAutomaticSubscription);
router.get('/payment-status/:paymentId', checkPaymentStatus);

module.exports = router; 