const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔍 authenticateToken - Iniciando...');
    console.log('🔍 req.cookies:', req.cookies);
    console.log('🔍 req.headers.authorization:', req.headers.authorization);
    
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    console.log('🔍 token extraído:', token ? 'SÍ' : 'NO');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            maxAppointments: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido o inactivo'
      });
    }

    req.user = user;
    req.businessId = user.businessId;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Middleware para verificar rol de administrador
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador'
    });
  }
  next();
};

// Middleware para verificar que el usuario pertenezca al negocio
const requireBusinessAccess = (req, res, next) => {
  const businessId = req.params.businessId || req.body.businessId || req.query.businessId;
  
  if (businessId && businessId !== req.businessId) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado a este negocio'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireBusinessAccess,
}; 