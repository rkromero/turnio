const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  getAvailablePlans,
  changePlan,
  getCurrentPlanInfo
} = require('../controllers/planController');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Validaciones para cambio de plan
const changePlanValidation = [
  body('newPlan')
    .notEmpty()
    .withMessage('El nuevo plan es requerido')
    .isIn(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'])
    .withMessage('Plan no válido')
];

// === RUTAS DE PLANES ===

// GET /api/plans/available - Obtener planes disponibles
router.get('/available', getAvailablePlans);

// GET /api/plans/current - Obtener información del plan actual
router.get('/current', getCurrentPlanInfo);

// PUT /api/plans/change - Cambiar plan del negocio
router.put('/change', changePlanValidation, changePlan);

module.exports = router; 