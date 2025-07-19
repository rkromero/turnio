const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, authenticateTokenOnly } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas excepto webhook
// REMOVIDO: El middleware global estaba causando problemas
// Aplicaremos autenticación individualmente a cada ruta que la necesite

// Rutas de configuración de MercadoPago (requieren autenticación)
router.get('/mp/connect', authenticateTokenOnly, paymentController.connectMercadoPago);
router.get('/mp/callback', paymentController.mercadoPagoCallback); // Callback OAuth GET (público)
router.get('/mp/status', authenticateTokenOnly, paymentController.getConnectionStatus);
router.delete('/mp/disconnect', authenticateTokenOnly, paymentController.disconnectMercadoPago);

// Rutas de preferencias de pago (requieren autenticación)
router.post('/preference', 
  authenticateTokenOnly,
  [
    body('appointmentId')
      .notEmpty()
      .withMessage('ID de cita es requerido')
      .isUUID()
      .withMessage('ID de cita debe ser un UUID válido')
  ],
  paymentController.createPaymentPreference
);

// Obtener opciones de pago basado en scoring (público)
router.get('/payment-options', paymentController.getPaymentOptions);

// Webhook de MercadoPago (sin autenticación)
router.post('/webhook', paymentController.webhook);

// Rutas de consulta de pagos (requieren autenticación)
router.get('/status/:appointmentId',
  authenticateTokenOnly,
  [
    param('appointmentId')
      .isUUID()
      .withMessage('ID de cita debe ser un UUID válido')
  ],
  paymentController.getPaymentStatus
);

router.get('/history', authenticateTokenOnly, paymentController.getPaymentHistory);

// Rutas de configuración de pagos (requieren autenticación)
router.get('/settings', authenticateTokenOnly, paymentController.getPaymentSettings);
router.put('/settings',
  authenticateTokenOnly,
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

// Callback de OAuth de MercadoPago POST (requiere autenticación)
router.post('/mp/callback', authenticateTokenOnly, paymentController.handleOAuthCallback);

module.exports = router; 