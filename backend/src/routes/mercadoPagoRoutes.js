const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateTokenOnly, requireAdmin } = require('../middleware/auth');
const {
  createSubscriptionPayment,
  handleWebhook,
  checkPaymentStatus
} = require('../controllers/mercadoPagoController');
const {
  createAutomaticSubscription,
  handleSubscriptionWebhook,
  cancelSubscription,
  syncPlanPrices
} = require('../controllers/subscriptionAutoController');

// ── Webhooks (públicos, sin auth — MP llama directamente) ───────────────────
router.post('/webhook', handleWebhook);
router.post('/subscription-webhook', handleSubscriptionWebhook);

// ── Rutas de pago: requieren token pero NO verificación de suscripción ───────
// (el usuario puede estar en estado SUSPENDED y aun así necesita pagar)
router.post('/create-payment', authenticateTokenOnly, createSubscriptionPayment);
router.post('/create-automatic-subscription', authenticateTokenOnly, createAutomaticSubscription);

// ── Rutas protegidas: requieren token + suscripción activa ──────────────────
router.use(authenticateToken);
router.get('/payment-status/:paymentId', checkPaymentStatus);
router.post('/cancel-subscription', cancelSubscription);

// ── Rutas de administración (solo admin) — BUG-03 ───────────────────────────
// Migración de precios: actualiza todas las preapprovals activas de un plan
// Usar SOLO después de notificar a los usuarios del cambio de precio
router.post('/admin/sync-plan-prices', authenticateToken, requireAdmin, syncPlanPrices);

module.exports = router;
