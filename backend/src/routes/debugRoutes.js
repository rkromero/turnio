const express = require('express');
const router = express.Router();
const { 
  applyPerformanceIndexes, 
  checkIndexes, 
  monitorIndexUsage,
  checkTableStructure,
  changePlanForUser
} = require('../controllers/debugController');
const schedulerService = require('../../schedulerService');
const RenewalReminderService = require('../services/renewalReminderService');

// Rutas para gestión de índices de performance
router.post('/apply-performance-indexes', applyPerformanceIndexes);
router.get('/check-indexes', checkIndexes);
router.get('/monitor-indexes', monitorIndexUsage);
router.get('/check-table-structure', checkTableStructure);

// Rutas para testing de suscripciones y renovaciones
router.post('/test-renewal-reminders', async (req, res) => {
  try {
    console.log('🧪 Testing: Ejecutando tareas de renovación...');
    const results = await RenewalReminderService.runAllRenewalTasks();
    res.json({
      success: true,
      message: 'Tareas de renovación ejecutadas',
      data: results
    });
  } catch (error) {
    console.error('❌ Error en test de renovaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando tareas de renovación',
      error: error.message
    });
  }
});

router.post('/test-subscription-validations', async (req, res) => {
  try {
    console.log('🧪 Testing: Ejecutando validaciones de suscripción...');
    const results = await schedulerService.runValidationsOnce();
    res.json({
      success: true,
      message: 'Validaciones ejecutadas',
      data: results
    });
  } catch (error) {
    console.error('❌ Error en test de validaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando validaciones',
      error: error.message
    });
  }
});

router.get('/scheduler-status', async (req, res) => {
  try {
    const status = schedulerService.getSchedulerStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('❌ Error obteniendo estado del scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado',
      error: error.message
    });
  }
});

// Cambiar plan de un usuario (para pruebas)
router.post('/change-user-plan', changePlanForUser);

module.exports = router;
