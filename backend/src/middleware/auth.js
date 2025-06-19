const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

// Middleware para verificar token JWT sin verificación de suscripción
const authenticateTokenOnly = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario y su negocio
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        business: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    req.user = user;
    req.businessId = user.businessId;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

// Middleware para verificar token JWT con verificación de suscripción
const authenticateToken = async (req, res, next) => {
  try {
    // Log para depuración
    console.log('🔍 Ruta solicitada:', req.path);
    
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario y su negocio con suscripción
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        business: {
          include: {
            subscription: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar estado de la suscripción
    if (user.business?.subscription) {
      const subscription = user.business.subscription;
      
      // Si la suscripción no es gratuita y está en estado fallido o vencido
      if (subscription.planType !== 'FREE' && 
         (subscription.status === 'PAYMENT_FAILED' || subscription.status === 'EXPIRED')) {
        
        // Permitir acceso a endpoints relacionados con pagos
        const paymentEndpoints = [
          'mercadopago/create-payment',
          'mercadopago/payment-status',
          'subscriptions/current',
          'mercadopago/webhook'
        ];
        
        // Log para depuración
        console.log('🔍 Verificando acceso a ruta:', req.path);
        console.log('🔍 Es ruta de pago:', paymentEndpoints.some(endpoint => req.path.includes(endpoint)));
        
        if (!paymentEndpoints.some(endpoint => req.path.includes(endpoint))) {
          return res.status(403).json({
            success: false,
            message: 'Tu suscripción ha vencido. Por favor, actualiza tu método de pago para continuar usando el sistema.',
            subscriptionStatus: subscription.status,
            requiresPayment: true
          });
        }
      }
    }

    req.user = user;
    req.businessId = user.businessId;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
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
  authenticateTokenOnly,
  requireAdmin,
  requireBusinessAccess,
}; 