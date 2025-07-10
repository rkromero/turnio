const express = require('express');
const { body } = require('express-validator');
const { authenticateTokenOnly } = require('../middleware/auth');
const router = express.Router();
const {
  getBranchBreakTimes,
  getAllBranchBreakTimes,
  createBreakTime,
  updateBreakTime,
  deleteBreakTime
} = require('../controllers/breakTimeController');

// Validaciones
const createBreakTimeValidation = [
  body('dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('El día de la semana debe ser un número entre 0 (domingo) y 6 (sábado)'),
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de inicio debe tener formato HH:MM'),
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de fin debe tener formato HH:MM'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre debe tener entre 1 y 100 caracteres')
];

const updateBreakTimeValidation = [
  body('dayOfWeek')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('El día de la semana debe ser un número entre 0 (domingo) y 6 (sábado)'),
  body('startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de inicio debe tener formato HH:MM'),
  body('endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de fin debe tener formato HH:MM'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre debe tener entre 1 y 100 caracteres'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser verdadero o falso')
];

// Rutas
// GET /api/break-times - Obtener horarios de todas las sucursales
router.get('/', authenticateTokenOnly, getAllBranchBreakTimes);

// GET /api/break-times/branch/:branchId - Obtener horarios de una sucursal específica
router.get('/branch/:branchId', authenticateTokenOnly, getBranchBreakTimes);

// POST /api/break-times/branch/:branchId - Crear horario de descanso para una sucursal
router.post('/branch/:branchId', authenticateTokenOnly, createBreakTimeValidation, createBreakTime);

// PUT /api/break-times/:breakTimeId - Actualizar horario de descanso
router.put('/:breakTimeId', authenticateTokenOnly, updateBreakTimeValidation, updateBreakTime);

// DELETE /api/break-times/:breakTimeId - Eliminar horario de descanso
router.delete('/:breakTimeId', authenticateTokenOnly, deleteBreakTime);

module.exports = router; 