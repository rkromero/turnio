const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const branchController = require('../controllers/branchController');
const { authenticateToken, authenticateTokenOnly, requireAdmin } = require('../middleware/auth');

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
  body('banner')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Permitir campo vacío, null o undefined
      if (!value || value.trim() === '') return true;
      // Permitir data URIs para imágenes (base64)
      if (value.startsWith('data:image/')) return true;
      // Validar URL solo si tiene contenido y no es data URI
      if (!value.match(/^https?:\/\/.+/)) {
        throw new Error('La URL del banner debe ser válida o un data URI de imagen');
      }
      return true;
    }),
  body('bannerAlt')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('El texto alternativo no puede exceder 200 caracteres'),
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
  body('banner')
    .optional({ checkFalsy: true })
    .custom((value) => {
      // Permitir campo vacío, null o undefined
      if (!value || value.trim() === '') return true;
      // Permitir data URIs para imágenes (base64)
      if (value.startsWith('data:image/')) return true;
      // Validar URL solo si tiene contenido y no es data URI
      if (!value.match(/^https?:\/\/.+/)) {
        throw new Error('La URL del banner debe ser válida o un data URI de imagen');
      }
      return true;
    }),
  body('bannerAlt')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('El texto alternativo no puede exceder 200 caracteres'),
  body('isMain')
    .optional()
    .isBoolean()
    .withMessage('isMain debe ser un boolean'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser un boolean'),
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

// Rutas de lectura (solo verifican token)
router.get('/', authenticateTokenOnly, branchController.getBranches);
router.get('/:branchId', authenticateTokenOnly, branchController.getBranchById);
router.get('/:branchId/services', authenticateTokenOnly, branchController.getBranchServices);

// Rutas de modificación (verifican token + suscripción + solo ADMIN)
router.post('/', authenticateToken, requireAdmin, createBranchValidation, branchController.createBranch);
router.put('/:branchId', authenticateToken, requireAdmin, updateBranchValidation, branchController.updateBranch);
router.delete('/:branchId', authenticateToken, requireAdmin, branchController.deleteBranch);
router.post('/:branchId/services', authenticateToken, requireAdmin, assignServiceValidation, branchController.assignServiceToBranch);

module.exports = router; 