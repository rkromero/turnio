// DEBUG: Forzar cambio para ver logs de orden de rutas en Railway
// CAMBIO NOTORIO: DEBUG DEPLOY - 2024-06-19
const DEBUG_DEPLOY = true;
const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateTokenOnly } = require('../middleware/auth');
const {
  createSubscriptionPayment,
  handleWebhook,
  checkPaymentStatus
} = require('../controllers/mercadoPagoController');
const { createAutomaticSubscription, handleSubscriptionWebhook } = require('../controllers/subscriptionAutoController');

// DEPLOY TEST - Forzar rebuild en Railway
console.log('🚀 DEPLOY TEST: MercadoPago routes loaded - v2.0');

// Rutas públicas (webhooks)
console.log('🔧 Configurando rutas públicas...');
router.post('/webhook', handleWebhook);
router.post('/subscription-webhook', handleSubscriptionWebhook);

// Ruta de creación de pago - requiere autenticación pero NO verificación de suscripción
// Esta ruta debe ir ANTES del middleware global para evitar bloqueo por estado de suscripción
console.log('🔧 Configurando ruta create-payment con authenticateTokenOnly...');
router.post('/create-payment', authenticateTokenOnly, createSubscriptionPayment);

// Rutas protegidas (requieren autenticación Y verificación de suscripción)
// Este middleware se aplica a TODAS las rutas que vengan después
console.log('🔧 Aplicando middleware authenticateToken a rutas restantes...');
router.use(authenticateToken);

console.log('🔧 Configurando rutas protegidas...');
router.post('/create-automatic-subscription', createAutomaticSubscription);
router.get('/payment-status/:paymentId', checkPaymentStatus);

console.log('✅ MercadoPago routes configuradas completamente');

module.exports = router; 