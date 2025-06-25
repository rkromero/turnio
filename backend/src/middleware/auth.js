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

    // ✅ VERIFICAR ESTADO DE LA SUSCRIPCIÓN MEJORADO
    const business = user.business;
    const subscription = business?.subscription;

    // Si no hay suscripción y el plan no es FREE, hay un problema
    if (!subscription && business?.planType !== 'FREE') {
      console.log('⚠️ Usuario sin suscripción en plan pagado:', business?.planType);
      return res.status(403).json({
        success: false,
        message: 'No tienes una suscripción activa. Por favor, contacta soporte.',
        requiresPayment: true
      });
    }

    // Si hay suscripción, verificar su estado
    if (subscription) {
      const now = new Date();
      
      // Para planes FREE, siempre permitir acceso (no tienen fecha de vencimiento)
      if (subscription.planType === 'FREE') {
        console.log('✅ Usuario con suscripción FREE activa');
        req.user = user;
        req.businessId = user.businessId;
        return next();
      }
      
      // Para planes pagados, verificar estado y fechas
      const isExpiredByDate = subscription.nextBillingDate && subscription.nextBillingDate < now;
      const isProblematicStatus = subscription.status === 'PAYMENT_FAILED' || 
                                 subscription.status === 'EXPIRED' || 
                                 subscription.status === 'SUSPENDED';
      
      if (isProblematicStatus || isExpiredByDate) {
        // Permitir acceso a endpoints de pago y suscripción
        const allowedEndpoints = [
          '/api/mercadopago/create-payment',
          '/api/mercadopago/payment-status',
          '/api/subscriptions/current',
          '/api/mercadopago/webhook',
          '/api/auth/profile',
          '/api/subscriptions/plans',
          '/api/payments/mp/connect',
          '/api/payments/mp/status',
          '/api/payments/mp/disconnect',
          '/api/payments/settings'
        ];
        
        console.log('🔍 Ruta actual:', req.originalUrl);
        console.log('🔍 Estado suscripción:', subscription.status);
        console.log('🔍 Fecha próximo cobro:', subscription.nextBillingDate);
        console.log('🔍 Vencida por fecha:', isExpiredByDate);
        
        if (!allowedEndpoints.includes(req.originalUrl)) {
          let message = 'Tu suscripción ha vencido. Por favor, actualiza tu método de pago para continuar usando el sistema.';
          
          if (isExpiredByDate) {
            message = `Tu suscripción venció el ${subscription.nextBillingDate.toLocaleDateString()}. Por favor, renueva tu pago para continuar.`;
          }
          
          return res.status(403).json({
            success: false,
            message: message,
            subscriptionStatus: subscription.status,
            requiresPayment: true,
            nextBillingDate: subscription.nextBillingDate,
            isExpiredByDate: isExpiredByDate
          });
        }
      }
    }

    // Si llegamos aquí, el usuario tiene acceso válido
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