const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, authenticateTokenOnly } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas excepto webhook
router.use((req, res, next) => {
  // El webhook no necesita autenticación JWT
  if (req.path === '/webhook') {
    return next();
  }
  // Usar autenticación sin verificación de suscripción para pagos
  return authenticateTokenOnly(req, res, next);
});

// Rutas de configuración de MercadoPago
router.get('/mp/connect', paymentController.connectMercadoPago);
router.get('/mp/callback', paymentController.mercadoPagoCallback);
router.get('/mp/status', paymentController.getConnectionStatus);
router.delete('/mp/disconnect', paymentController.disconnectMercadoPago);

// Rutas de preferencias de pago
router.post('/preference', 
  [
    body('appointmentId')
      .notEmpty()
      .withMessage('ID de cita es requerido')
      .isUUID()
      .withMessage('ID de cita debe ser un UUID válido')
  ],
  paymentController.createPaymentPreference
);

// Webhook de MercadoPago (sin autenticación)
router.post('/webhook', paymentController.webhook);

// Rutas de consulta de pagos
router.get('/status/:appointmentId',
  [
    param('appointmentId')
      .isUUID()
      .withMessage('ID de cita debe ser un UUID válido')
  ],
  paymentController.getPaymentStatus
);

router.get('/history', paymentController.getPaymentHistory);

// Rutas de configuración de pagos
router.get('/settings', paymentController.getPaymentSettings);
router.put('/settings',
  [
    body('require_payment')
      .optional()
      .isBoolean()
      .withMessage('require_payment debe ser booleano'),
    body('payment_deadline_hours')
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage('payment_deadline_hours debe ser entre 1 y 168 horas'),
    body('auto_cancel_unpaid')
      .optional()
      .isBoolean()
      .withMessage('auto_cancel_unpaid debe ser booleano')
  ],
  paymentController.updatePaymentSettings
);

// Callback de OAuth de MercadoPago
router.post('/mp/callback', paymentController.handleOAuthCallback);

module.exports = router; 