/**
 * Rutas de Predicción de Riesgo de Cancelaciones
 */

const express = require('express');
const router = express.Router();
const riskPredictionController = require('../controllers/riskPredictionController');
const { verifyToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * @route   GET /api/risk-predictions/stats
 * @desc    Obtener estadísticas generales de predicciones
 * @access  Private
 */
router.get('/stats', riskPredictionController.getStats);

/**
 * @route   GET /api/risk-predictions/risky
 * @desc    Obtener lista de citas con riesgo de cancelación
 * @query   level (HIGH, MEDIUM, LOW, ALL)
 * @query   limit (número de resultados)
 * @query   branchId (filtrar por sucursal)
 * @access  Private
 */
router.get('/risky', riskPredictionController.getRiskyAppointments);

/**
 * @route   GET /api/risk-predictions/:appointmentId
 * @desc    Obtener predicción de riesgo de una cita específica
 * @access  Private
 */
router.get('/:appointmentId', riskPredictionController.getRiskPrediction);

/**
 * @route   POST /api/risk-predictions/calculate/:appointmentId
 * @desc    Calcular/recalcular predicción de una cita
 * @access  Private
 */
router.post('/calculate/:appointmentId', riskPredictionController.calculatePrediction);

/**
 * @route   POST /api/risk-predictions/recalculate-all
 * @desc    Recalcular todas las predicciones (solo ADMIN)
 * @access  Private (ADMIN only)
 */
router.post('/recalculate-all', riskPredictionController.recalculateAll);

/**
 * @route   POST /api/risk-predictions/update-time-slot-stats
 * @desc    Actualizar estadísticas de franjas horarias (solo ADMIN)
 * @access  Private (ADMIN only)
 */
router.post('/update-time-slot-stats', riskPredictionController.updateTimeSlotStats);

/**
 * @route   POST /api/risk-predictions/send-high-risk-reminders
 * @desc    Enviar recordatorios extra a citas de alto riesgo (solo ADMIN)
 * @access  Private (ADMIN only)
 */
router.post('/send-high-risk-reminders', async (req, res) => {
  try {
    const businessId = req.businessId;
    const userRole = req.user?.role;

    // Solo ADMIN puede enviar recordatorios masivos
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden enviar recordatorios de alto riesgo'
      });
    }

    const appointmentReminderService = require('../services/appointmentReminderService');
    const result = await appointmentReminderService.sendHighRiskReminders(businessId);

    res.json({
      success: true,
      data: result,
      message: 'Recordatorios de alto riesgo procesados'
    });
  } catch (error) {
    console.error('Error enviando recordatorios de alto riesgo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar recordatorios de alto riesgo',
      error: error.message
    });
  }
});

module.exports = router;

