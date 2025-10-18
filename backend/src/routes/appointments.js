const express = require('express');
const { body } = require('express-validator');
const { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  cancelAppointment,
  getAvailableTimes,
  getAvailableSlots,
  getAvailableProfessionals,
  getAllProfessionals,
  getProfessionalServices,
  getBusinessServices,
  getProfessionalAvailability,
  getPublicBranches
} = require('../controllers/appointmentController');
const { authenticateToken, authenticateTokenOnly, requireBusinessAccess } = require('../middleware/auth');

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
    .matches(/^[\+]?[\d\s\-\(\)]{7,20}$/)
    .withMessage('Número de teléfono inválido - debe tener entre 7 y 20 caracteres'),
  body('serviceId')
    .notEmpty()
    .withMessage('El servicio es requerido'),
  body('startTime')
    .matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?([+-]\d{2}:\d{2}|Z)?$/)
    .withMessage('Fecha y hora inválida - formato requerido: YYYY-MM-DDTHH:MM'),
  body('paymentMethod')
    .optional()
    .isIn(['local', 'online', 'prepaid'])
    .withMessage('Método de pago inválido - debe ser: local, online, o prepaid'),
];

// Rutas públicas (para reservas online)
router.get('/public/:businessSlug/branches', getPublicBranches);
router.get('/public/:businessSlug/professionals', getAvailableProfessionals);
router.get('/public/:businessSlug/all-professionals', getAllProfessionals);
router.get('/public/:businessSlug/professional/:professionalId/services', getProfessionalServices);
router.get('/public/:businessSlug/professional/:professionalId/availability', getProfessionalAvailability);
router.get('/public/:businessSlug/services', getBusinessServices);
router.get('/public/:businessSlug/available-slots', getAvailableSlots);

// Rutas de lectura (solo verifican token)
router.get('/', authenticateTokenOnly, getAppointments);
router.get('/available-times', authenticateTokenOnly, getAvailableTimes);

// Rutas de modificación (requieren suscripción válida)
router.post('/', authenticateToken, createAppointmentValidation, createAppointment);
router.put('/:id', authenticateToken, updateAppointment);
router.delete('/:id', authenticateToken, cancelAppointment);

module.exports = router;