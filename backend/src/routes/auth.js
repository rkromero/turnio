const express = require('express');
const { body } = require('express-validator');
const { registerBusiness, login, logout, getProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Validaciones para registro
const registerValidation = [
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del negocio debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('phone')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]{8,20}$/)
    .withMessage('El teléfono debe tener entre 8 y 20 caracteres y solo contener números, espacios, guiones y paréntesis'),
  body('businessType')
    .optional()
    .isIn(['GENERAL', 'BARBERSHOP', 'HAIR_SALON', 'BEAUTY_CENTER', 'MEDICAL_CENTER', 'MASSAGE_SPA'])
    .withMessage('Tipo de negocio inválido'),
  body('defaultAppointmentDuration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('La duración debe estar entre 15 y 480 minutos'),
];

// Validaciones para login
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
];

// Rutas públicas
router.post('/register', registerValidation, registerBusiness);
router.post('/login', loginValidation, login);

// Rutas protegidas
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);

// Ruta para crear usuario de prueba (desarrollo)
router.post('/create-test-user', authController.createTestUser);

module.exports = router; 