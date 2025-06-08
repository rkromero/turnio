const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserStats
} = require('../controllers/userController');

// Validaciones comunes
const userValidation = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['ADMIN', 'EMPLOYEE'])
    .withMessage('El rol debe ser ADMIN o EMPLOYEE'),
  body('phone')
    .optional()
    .custom((value) => {
      // Permitir campo vacío, null o undefined
      if (!value || value.trim() === '') return true; 
      // Validar formato solo si tiene contenido
      if (!/^[\d\s\-\+\(\)]+$/.test(value.trim())) {
        throw new Error('Formato de teléfono inválido');
      }
      return true;
    }),
  body('avatar')
    .optional()
    .custom((value) => {
      // Permitir campo vacío, null o undefined
      if (!value || value.trim() === '') return true;
      // Validar URL solo si tiene contenido
      if (!value.match(/^https?:\/\/.+/)) {
        throw new Error('La URL del avatar debe ser válida');
      }
      return true;
    }),
  body('branchId')
    .optional()
    .isString()
    .withMessage('branchId debe ser un string válido')
];

const createUserValidation = [
  ...userValidation,
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .withMessage('La contraseña debe contener al menos: 1 minúscula, 1 mayúscula y 1 número')
];

const updateUserValidation = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['ADMIN', 'EMPLOYEE'])
    .withMessage('El rol debe ser ADMIN o EMPLOYEE'),
  body('phone')
    .optional()
    .custom((value) => {
      // Permitir campo vacío, null o undefined
      if (!value || value.trim() === '') return true; 
      // Validar formato solo si tiene contenido
      if (!/^[\d\s\-\+\(\)]+$/.test(value.trim())) {
        throw new Error('Formato de teléfono inválido');
      }
      return true;
    }),
  body('avatar')
    .optional()
    .custom((value) => {
      // Permitir campo vacío, null o undefined
      if (!value || value.trim() === '') return true;
      // Validar URL solo si tiene contenido
      if (!value.match(/^https?:\/\/.+/)) {
        throw new Error('La URL del avatar debe ser válida');
      }
      return true;
    }),
  body('branchId')
    .optional()
    .isString()
    .withMessage('branchId debe ser un string válido'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .withMessage('La contraseña debe contener al menos: 1 minúscula, 1 mayúscula y 1 número')
];

const toggleStatusValidation = [
  body('isActive')
    .isBoolean()
    .withMessage('isActive debe ser un valor booleano')
];

// Rutas

// GET /api/users - Obtener todos los usuarios/empleados (con filtro opcional por sucursal)
router.get('/', authenticateToken, getUsers);

// GET /api/users/stats - Obtener estadísticas de usuarios
router.get('/stats', authenticateToken, getUserStats);

// GET /api/users/:id - Obtener un usuario específico
router.get('/:id', authenticateToken, getUser);

// POST /api/users - Crear nuevo usuario/empleado (con asignación automática de sucursal)
router.post('/', authenticateToken, createUserValidation, createUser);

// PUT /api/users/:id - Actualizar usuario (incluye cambio de sucursal)
router.put('/:id', authenticateToken, updateUserValidation, updateUser);

// PATCH /api/users/:id/status - Activar/desactivar usuario
router.patch('/:id/status', authenticateToken, toggleStatusValidation, toggleUserStatus);

// DELETE /api/users/:id - Eliminar usuario (desactivar)
router.delete('/:id', authenticateToken, deleteUser);

module.exports = router; 