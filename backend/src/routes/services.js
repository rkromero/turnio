const express = require('express');
const { body } = require('express-validator');
const { 
  getServices, 
  createService, 
  updateService, 
  deleteService,
  getServiceStats 
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
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

router.get('/', getServices);
router.get('/stats', getServiceStats);
router.post('/', requireAdmin, serviceValidation, createService);
router.put('/:id', requireAdmin, updateService);
router.delete('/:id', requireAdmin, deleteService);

module.exports = router;