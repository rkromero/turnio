const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticateToken, authenticateTokenOnly, requireAdmin } = require('../middleware/auth');
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

// GET /api/users - Obtener todos los usuarios/empleados (ADMIN puede ver todos, EMPLOYEE solo se ve a sí mismo)
router.get('/', authenticateTokenOnly, getUsers);

// GET /api/users/stats - Obtener estadísticas de usuarios (solo ADMIN)
router.get('/stats', authenticateToken, requireAdmin, getUserStats);

// GET /api/users/:id - Obtener un usuario específico (ADMIN ve cualquiera, EMPLOYEE solo su propio perfil)
router.get('/:id', authenticateTokenOnly, getUser);

// POST /api/users - Crear nuevo usuario/empleado (solo ADMIN)
router.post('/', authenticateToken, requireAdmin, createUserValidation, createUser);

// PUT /api/users/:id - Actualizar usuario (ADMIN actualiza cualquiera, EMPLOYEE solo su propio perfil)
router.put('/:id', authenticateTokenOnly, updateUserValidation, updateUser);

// PATCH /api/users/:id/status - Activar/desactivar usuario (solo ADMIN)
router.patch('/:id/status', authenticateToken, requireAdmin, toggleStatusValidation, toggleUserStatus);

// DELETE /api/users/:id - Eliminar usuario (solo ADMIN)
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);

module.exports = router; 