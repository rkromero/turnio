const express = require('express');
const { body, param } = require('express-validator');
const { 
  getServices, 
  createService, 
  updateService, 
  deleteService,
  getServiceStats,
  getPublicServices,
  // Nuevas funciones multi-sucursal
  getServicesByBranch,
  assignServiceToBranch,
  updateBranchServicePrice,
  removeBranchService,
  getBranchServiceStats
} = require('../controllers/serviceController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Validaciones para crear/actualizar servicio
const serviceValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del servicio debe tener entre 2 y 100 caracteres'),
  body('duration')
    .isInt({ min: 15, max: 480 })
    .withMessage('La duración debe ser entre 15 y 480 minutos'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('El color debe ser un código hexadecimal válido'),
  body('isGlobal')
    .optional()
    .isBoolean()
    .withMessage('isGlobal debe ser un boolean'),
  body('branchIds')
    .optional()
    .isArray()
    .withMessage('branchIds debe ser un array')
];

// Validaciones para operaciones de sucursal
const branchServiceValidation = [
  param('branchId')
    .notEmpty()
    .withMessage('ID de sucursal es requerido'),
  param('serviceId')
    .notEmpty()
    .withMessage('ID de servicio es requerido')
];

const branchServicePriceValidation = [
  ...branchServiceValidation,
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo')
];

// Ruta pública (sin autenticación)
router.get('/public/:businessSlug', getPublicServices);

// Todas las rutas siguientes requieren autenticación
router.use(authenticateToken);

// Rutas principales de servicios
router.get('/', getServices);
router.get('/stats', getServiceStats);
router.post('/', requireAdmin, serviceValidation, createService);
router.put('/:id', requireAdmin, updateService);
router.delete('/:id', requireAdmin, deleteService);

// Rutas para gestión de servicios por sucursal
router.get('/branch/:branchId', getServicesByBranch);
router.get('/branch/:branchId/stats', getBranchServiceStats);
router.post('/branch/:branchId/assign/:serviceId', requireAdmin, branchServicePriceValidation, assignServiceToBranch);
router.put('/branch/:branchId/price/:serviceId', requireAdmin, branchServicePriceValidation, updateBranchServicePrice);
router.delete('/branch/:branchId/remove/:serviceId', requireAdmin, branchServiceValidation, removeBranchService);

module.exports = router;