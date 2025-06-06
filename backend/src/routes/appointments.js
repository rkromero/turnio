const express = require('express');
const { body } = require('express-validator');
const { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  cancelAppointment,
  getAvailableSlots 
} = require('../controllers/appointmentController');
const { authenticateToken, requireBusinessAccess } = require('../middleware/auth');

const router = express.Router();

// Validaciones para crear turno
const createAppointmentValidation = [
  body('clientName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del cliente debe tener entre 2 y 100 caracteres'),
  body('clientEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('clientPhone')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Número de teléfono inválido'),
  body('serviceId')
    .notEmpty()
    .withMessage('El servicio es requerido'),
  body('startTime')
    .isISO8601()
    .withMessage('Fecha y hora inválida'),
];

// Rutas públicas (para reservas online)
router.get('/public/:businessSlug/available-slots', getAvailableSlots);

// Rutas protegidas
router.use(authenticateToken);

router.get('/', getAppointments);
router.post('/', createAppointmentValidation, createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', cancelAppointment);

module.exports = router;