const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createSubscriptionPayment,
  handleWebhook,
  checkPaymentStatus
} = require('../controllers/mercadoPagoController');

// Webhook público (sin autenticación) - MercadoPago llama a este endpoint
router.post('/webhook', handleWebhook);

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

router.post('/create-payment', createSubscriptionPayment);
router.get('/payment-status/:paymentId', checkPaymentStatus);

module.exports = router; 