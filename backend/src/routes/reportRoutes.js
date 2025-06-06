const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const {
  getDashboardMetrics,
  getRevenueReport,
  getServicesReport,
  getClientsReport
} = require('../controllers/reportController');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Error de validación',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/reports/dashboard - Métricas generales del dashboard
router.get('/dashboard',
  authMiddleware,
  query('period')
    .optional()
    .isNumeric()
    .withMessage('El período debe ser un número')
    .isInt({ min: 1, max: 365 })
    .withMessage('El período debe estar entre 1 y 365 días'),
  handleValidationErrors,
  getDashboardMetrics
);

// GET /api/reports/revenue - Reporte detallado de ingresos
router.get('/revenue',
  authMiddleware,
  query('startDate')
    .notEmpty()
    .withMessage('La fecha de inicio es requerida')
    .isISO8601()
    .withMessage('La fecha de inicio debe ser válida (formato ISO 8601)'),
  query('endDate')
    .notEmpty()
    .withMessage('La fecha de fin es requerida')
    .isISO8601()
    .withMessage('La fecha de fin debe ser válida (formato ISO 8601)'),
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('groupBy debe ser: day, week, o month'),
  handleValidationErrors,
  getRevenueReport
);

// GET /api/reports/services - Reporte de servicios
router.get('/services',
  authMiddleware,
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de inicio debe ser válida (formato ISO 8601)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de fin debe ser válida (formato ISO 8601)'),
  handleValidationErrors,
  getServicesReport
);

// GET /api/reports/clients - Reporte de clientes
router.get('/clients',
  authMiddleware,
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de inicio debe ser válida (formato ISO 8601)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de fin debe ser válida (formato ISO 8601)'),
  handleValidationErrors,
  getClientsReport
);

module.exports = router; 