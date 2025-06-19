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
          '/api/mercadopago/create-payment',
          '/api/mercadopago/payment-status',
          '/api/subscriptions/current'
        ];
        
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
  requireAdmin,
  requireBusinessAccess,
}; 