const express = require('express');
const { body } = require('express-validator');
const { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  cancelAppointment,
  getAvailableSlots,
  getAvailableProfessionals,
  getAllProfessionals,
  getProfessionalServices,
  getBusinessServices,
  getProfessionalAvailability,
  getPublicBranches
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
router.get('/public/:businessSlug/branches', getPublicBranches);
router.get('/public/:businessSlug/professionals', getAvailableProfessionals);
router.get('/public/:businessSlug/all-professionals', getAllProfessionals);
router.get('/public/:businessSlug/professional/:professionalId/services', getProfessionalServices);
router.get('/public/:businessSlug/professional/:professionalId/availability', getProfessionalAvailability);
router.get('/public/:businessSlug/services', getBusinessServices);
router.get('/public/:businessSlug/available-slots', getAvailableSlots);

// Rutas protegidas
router.use(authenticateToken);

router.get('/', getAppointments);
router.post('/', createAppointmentValidation, createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', cancelAppointment);

module.exports = router;