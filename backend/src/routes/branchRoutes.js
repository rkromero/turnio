const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const branchController = require('../controllers/branchController');
const { authenticateToken } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Validaciones
const createBranchValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('slug')
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('El identificador debe contener solo letras minúsculas, números y guiones'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
  body('phone')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Si está vacío, null o undefined, permitir
      if (!value || value.trim() === '') return true;
      // Si tiene contenido, validar formato
      if (!/^[\+]?[\d\s\-\(\)]{10,20}$/.test(value.trim())) {
        throw new Error('Número de teléfono inválido');
      }
      return true;
    }),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  body('isMain')
    .optional()
    .isBoolean()
    .withMessage('isMain debe ser un boolean'),
  body('latitude')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Si está vacío, null o undefined, permitir
      if (!value || value === '') return true;
      // Si tiene contenido, validar rango
      const num = parseFloat(value);
      if (isNaN(num) || num < -90 || num > 90) {
        throw new Error('Latitud debe estar entre -90 y 90');
      }
      return true;
    }),
  body('longitude')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Si está vacío, null o undefined, permitir
      if (!value || value === '') return true;
      // Si tiene contenido, validar rango
      const num = parseFloat(value);
      if (isNaN(num) || num < -180 || num > 180) {
        throw new Error('Longitud debe estar entre -180 y 180');
      }
      return true;
    }),
  body('timezone')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Timezone debe ser un string válido')
];

const updateBranchValidation = [
  param('branchId')
    .notEmpty()
    .withMessage('ID de sucursal es requerido'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('El identificador debe contener solo letras minúsculas, números y guiones'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
  body('phone')
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Número de teléfono inválido'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  body('isMain')
    .optional()
    .isBoolean()
    .withMessage('isMain debe ser un boolean'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser un boolean'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitud debe estar entre -90 y 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitud debe estar entre -180 y 180'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone debe ser un string válido')
];

const assignServiceValidation = [
  param('branchId')
    .notEmpty()
    .withMessage('ID de sucursal es requerido'),
  body('serviceId')
    .notEmpty()
    .withMessage('ID de servicio es requerido'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo')
];

// Rutas
router.get('/', branchController.getBranches);
router.get('/:branchId', branchController.getBranchById);
router.post('/', createBranchValidation, branchController.createBranch);
router.put('/:branchId', updateBranchValidation, branchController.updateBranch);
router.delete('/:branchId', branchController.deleteBranch);

// Rutas para servicios de sucursal
router.get('/:branchId/services', branchController.getBranchServices);
router.post('/:branchId/services', assignServiceValidation, branchController.assignServiceToBranch);

module.exports = router; 