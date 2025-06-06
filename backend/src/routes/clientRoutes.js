const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientStats
} = require('../controllers/clientController');

const router = express.Router();

// Validaciones para clientes
const clientValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .isMobilePhone('any')
    .withMessage('Teléfono inválido'),
  
  body('notes')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
];

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Obtener estadísticas de clientes
router.get('/stats', getClientStats);

// Obtener todos los clientes
router.get('/', getClients);

// Obtener un cliente específico
router.get('/:id', getClient);

// Crear nuevo cliente
router.post('/', clientValidation, createClient);

// Actualizar cliente
router.put('/:id', clientValidation, updateClient);

// Eliminar cliente
router.delete('/:id', deleteClient);

module.exports = router; 