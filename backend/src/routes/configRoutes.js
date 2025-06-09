const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  getBusinessConfig,
  updateBusinessConfig,
  getWorkingHours,
  updateWorkingHours,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getPlanUsage
} = require('../controllers/configController');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Validaciones para actualizar configuración del negocio
const updateBusinessValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('phone')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Número de teléfono inválido'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  body('primaryColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('El color debe ser un código hexadecimal válido'),
  body('logo')
    .optional()
    .isURL()
    .withMessage('El logo debe ser una URL válida'),
  body('businessType')
    .optional()
    .isIn(['GENERAL', 'BARBERSHOP', 'HAIR_SALON', 'BEAUTY_CENTER', 'MEDICAL_CENTER', 'MASSAGE_SPA'])
    .withMessage('Tipo de negocio inválido'),
  body('defaultAppointmentDuration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('La duración debe estar entre 15 y 480 minutos')
];

// Validaciones para horarios de trabajo
const updateWorkingHoursValidation = [
  param('userId')
    .notEmpty()
    .withMessage('ID de usuario es requerido'),
  body('workingHours')
    .isArray()
    .withMessage('Los horarios deben ser un array'),
  body('workingHours.*.dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('Día de la semana debe ser un número entre 0 y 6'),
  body('workingHours.*.startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de inicio debe tener formato HH:MM'),
  body('workingHours.*.endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de fin debe tener formato HH:MM'),
  body('workingHours.*.isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser un boolean')
];

// Validaciones para feriados
const createHolidayValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('date')
    .isISO8601()
    .withMessage('La fecha debe ser válida'),
  body('isRecurring')
    .optional()
    .isBoolean()
    .withMessage('isRecurring debe ser un boolean')
];

const updateHolidayValidation = [
  param('id')
    .notEmpty()
    .withMessage('ID de feriado es requerido'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('La fecha debe ser válida'),
  body('isRecurring')
    .optional()
    .isBoolean()
    .withMessage('isRecurring debe ser un boolean')
];

// === RUTAS DE CONFIGURACIÓN DEL NEGOCIO ===
// GET /api/config/business - Obtener configuración del negocio
router.get('/business', getBusinessConfig);

// PUT /api/config/business - Actualizar configuración del negocio
router.put('/business', updateBusinessValidation, updateBusinessConfig);

// === RUTAS DE HORARIOS DE TRABAJO ===
// GET /api/config/working-hours - Obtener horarios de trabajo
router.get('/working-hours', getWorkingHours);

// PUT /api/config/working-hours/:userId - Actualizar horarios de un usuario
router.put('/working-hours/:userId', updateWorkingHoursValidation, updateWorkingHours);

// === RUTAS DE FERIADOS ===
// GET /api/config/holidays - Obtener feriados
router.get('/holidays', getHolidays);

// POST /api/config/holidays - Crear feriado
router.post('/holidays', createHolidayValidation, createHoliday);

// PUT /api/config/holidays/:id - Actualizar feriado
router.put('/holidays/:id', updateHolidayValidation, updateHoliday);

// DELETE /api/config/holidays/:id - Eliminar feriado
router.delete('/holidays/:id', deleteHoliday);

// === RUTAS DE PLAN Y ESTADÍSTICAS ===
// GET /api/config/plan-usage - Obtener estadísticas de uso del plan
router.get('/plan-usage', getPlanUsage);

module.exports = router; 