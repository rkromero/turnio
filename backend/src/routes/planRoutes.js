const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authenticateTokenOnly } = require('../middleware/auth');
const {
  getAvailablePlans,
  changePlan,
  getCurrentPlanInfo
} = require('../controllers/planController');

const router = express.Router();

// Validaciones para cambio de plan
const changePlanValidation = [
  body('newPlan')
    .notEmpty()
    .withMessage('El nuevo plan es requerido')
    .isIn(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'])
    .withMessage('Plan no válido')
];

// === RUTAS DE PLANES ===

// GET /api/plans/available - Obtener planes disponibles (solo verifica token)
router.get('/available', authenticateTokenOnly, getAvailablePlans);

// GET /api/plans/current - Obtener información del plan actual (solo verifica token)
router.get('/current', authenticateTokenOnly, getCurrentPlanInfo);

// PUT /api/plans/change - Cambiar plan del negocio (requiere suscripción válida)
router.put('/change', authenticateToken, changePlanValidation, changePlan);

module.exports = router; 