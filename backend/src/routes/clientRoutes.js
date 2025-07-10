const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, authenticateTokenOnly } = require('../middleware/auth');
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

// Rutas de lectura (solo verifican token)
router.get('/stats', authenticateTokenOnly, getClientStats);
router.get('/', authenticateTokenOnly, getClients);
router.get('/:id', authenticateTokenOnly, getClient);

// Rutas de modificación (solo verifican token, límites se validan en controlador)
router.post('/', authenticateTokenOnly, clientValidation, createClient);
router.put('/:id', authenticateTokenOnly, clientValidation, updateClient);
router.delete('/:id', authenticateTokenOnly, deleteClient);

module.exports = router; 