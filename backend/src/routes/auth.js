const express = require('express');
const { body } = require('express-validator');
const { registerBusiness, login, logout, getProfile } = require('../controllers/authController');
const { authenticateToken, authenticateTokenOnly } = require('../middleware/auth');
const authController = require('../controllers/authController');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

const router = express.Router();

// Middleware simplificado para depurar
const simpleAuthMiddleware = async (req, res, next) => {
  try {
    console.log('🔍 Simple auth middleware - iniciando');
    
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    console.log('🔍 Token presente:', !!token);
    
    if (!token) {
      console.log('❌ No token found');
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }
    
    console.log('🔍 Verificando token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Token decodificado:', { userId: decoded.userId, businessId: decoded.businessId });
    
    console.log('🔍 Buscando usuario en BD...');
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        business: true
      }
    });
    
    console.log('🔍 Usuario encontrado:', !!user);
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    console.log('✅ Auth exitosa');
    req.user = user;
    req.businessId = user.businessId;
    next();
    
  } catch (error) {
    console.error('❌ Error en auth simple:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

// Validaciones para registro
const registerValidation = [
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del negocio debe tener entre 2 y 100 caracteres'),
  body('professionalName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del profesional debe tener entre 2 y 100 caracteres'),
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
router.get('/profile', authenticateTokenOnly, getProfile); // Usar authenticateTokenOnly para perfil básico

// Ruta de prueba para depurar autenticación
router.get('/test-auth', authenticateTokenOnly, (req, res) => {
  res.json({
    success: true,
    message: 'Autenticación funcionando correctamente',
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    },
    businessId: req.businessId,
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba SIN middleware para verificar si el problema está en el middleware
router.get('/test-basic', (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  res.json({
    success: true,
    message: 'Endpoint básico funcionando',
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    cookies: Object.keys(req.cookies || {}),
    headers: {
      authorization: !!req.headers.authorization,
      cookie: !!req.headers.cookie
    },
    timestamp: new Date().toISOString()
  });
});

// Ruta de prueba CON middleware simple para comparar
router.get('/test-simple', simpleAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Middleware simple funcionando',
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    },
    businessId: req.businessId,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para limpiar cookies duplicadas y verificar BD
router.post('/debug-fix', async (req, res) => {
  try {
    console.log('🔧 [DEBUG FIX] Iniciando limpieza...');
    
    // Limpiar cookies
    res.clearCookie('token', { path: '/', httpOnly: true });
    
    // Verificar usuarios en BD
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('🔧 [DEBUG FIX] Usuarios en BD:', users);
    
    res.json({
      success: true,
      message: 'Cookies limpiadas y BD verificada',
      users: users,
      instruction: 'Intenta hacer login nuevamente'
    });
    
  } catch (error) {
    console.error('❌ [DEBUG FIX] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Ruta para crear usuario de prueba (desarrollo)
router.post('/create-test-user', authController.createTestUser);

module.exports = router; 