const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   GET /api/notifications/settings
 * @desc    Obtener configuración de notificaciones
 * @access  Private (ADMIN, EMPLOYEE)
 */
router.get('/settings', notificationController.getNotificationSettings);

/**
 * @route   PUT /api/notifications/settings
 * @desc    Actualizar configuración de notificaciones
 * @access  Private (ADMIN only)
 */
router.put('/settings', requireAdmin, notificationController.updateNotificationSettings);

/**
 * @route   GET /api/notifications/history
 * @desc    Obtener historial de notificaciones
 * @access  Private (ADMIN only)
 */
router.get('/history', requireAdmin, notificationController.getNotificationHistory);

/**
 * @route   GET /api/notifications/stats
 * @desc    Obtener estadísticas de notificaciones
 * @access  Private (ADMIN only)
 */
router.get('/stats', requireAdmin, notificationController.getNotificationStats);

/**
 * @route   POST /api/notifications/test-email
 * @desc    Enviar email de prueba
 * @access  Private (ADMIN only)
 */
router.post('/test-email', requireAdmin, notificationController.sendTestEmail);

/**
 * @route   POST /api/notifications/send-reminder/:appointmentId
 * @desc    Enviar recordatorio manual para una cita
 * @access  Private (ADMIN, EMPLOYEE)
 */
router.post('/send-reminder/:appointmentId', notificationController.sendManualReminder);

module.exports = router;

