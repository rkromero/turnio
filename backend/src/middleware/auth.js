const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { logDebug, logError } = require('../utils/logger');

// Middleware para verificar token JWT sin verificación de suscripción
const authenticateTokenOnly = async (req, res, next) => {
  try {
    // Logs detallados SOLO para /api/auth/profile para diagnosticar
    if (req.originalUrl === '/api/auth/profile') {
      console.log('🔍 [PROFILE DEBUG] Iniciando authenticateTokenOnly');
      console.log('🔍 [PROFILE DEBUG] req.cookies:', req.cookies);
      console.log('🔍 [PROFILE DEBUG] req.headers.authorization:', req.headers.authorization);
      console.log('🔍 [PROFILE DEBUG] req.headers.cookie:', req.headers.cookie);
    }

    // Manejar cookies duplicadas - tomar el ÚLTIMO token si hay múltiples
    let token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    // Si hay múltiples tokens en las cookies, tomar el último
    if (req.headers.cookie && req.headers.cookie.includes('token=')) {
      const tokenMatches = req.headers.cookie.match(/token=([^;]+)/g);
      if (tokenMatches && tokenMatches.length > 1) {
        // Tomar el último token
        token = tokenMatches[tokenMatches.length - 1].replace('token=', '');
        if (req.originalUrl === '/api/auth/profile') {
          console.log('🔍 [PROFILE DEBUG] Múltiples tokens detectados, usando el último:', token.substring(0, 20) + '...');
        }
      }
    }

    if (req.originalUrl === '/api/auth/profile') {
      console.log('🔍 [PROFILE DEBUG] Token extraído:', token ? 'SÍ (' + token.length + ' chars)' : 'NO');
    }

    if (!token) {
      if (req.originalUrl === '/api/auth/profile') {
        console.log('❌ [PROFILE DEBUG] No token encontrado');
      }
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    if (req.originalUrl === '/api/auth/profile') {
      console.log('🔍 [PROFILE DEBUG] Verificando token con JWT...');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (req.originalUrl === '/api/auth/profile') {
      console.log('🔍 [PROFILE DEBUG] Token decodificado:', { userId: decoded.userId, businessId: decoded.businessId });
    }
    
    // Buscar usuario y su negocio
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        business: true
      }
    });

    if (req.originalUrl === '/api/auth/profile') {
      console.log('🔍 [PROFILE DEBUG] Usuario encontrado en BD:', user ? 'SÍ' : 'NO');
      if (user) {
        console.log('🔍 [PROFILE DEBUG] User details:', { id: user.id, email: user.email, businessId: user.businessId });
      }
    }

    if (!user) {
      if (req.originalUrl === '/api/auth/profile') {
        console.log('❌ [PROFILE DEBUG] Usuario no encontrado en BD');
      }
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (req.originalUrl === '/api/auth/profile') {
      console.log('✅ [PROFILE DEBUG] Autenticación exitosa, pasando al siguiente middleware');
    }

    req.user = user;
    req.businessId = user.businessId;
    next();
  } catch (error) {
    if (req.originalUrl === '/api/auth/profile') {
      console.error('❌ [PROFILE DEBUG] Error en authenticateTokenOnly:', error.message);
      console.error('❌ [PROFILE DEBUG] Error stack:', error.stack);
    }
    console.error('Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

// Middleware para verificar token JWT con verificación de suscripción
const authenticateToken = async (req, res, next) => {
  try {
    // Manejar cookies duplicadas - tomar el ÚLTIMO token si hay múltiples
    let token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    // Si hay múltiples tokens en las cookies, tomar el último
    if (req.headers.cookie && req.headers.cookie.includes('token=')) {
      const tokenMatches = req.headers.cookie.match(/token=([^;]+)/g);
      if (tokenMatches && tokenMatches.length > 1) {
        // Tomar el último token
        token = tokenMatches[tokenMatches.length - 1].replace('token=', '');
      }
    }

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
        // Permitir acceso a endpoints de pago, suscripción y configuración básica
        const allowedEndpoints = [
          // MercadoPago y pagos
          '/api/mercadopago/create-payment',
          '/api/mercadopago/payment-status',
          '/api/mercadopago/webhook',
          '/api/payments/mp/connect',
          '/api/payments/mp/status',
          '/api/payments/mp/disconnect',
          '/api/payments/settings',

          // Suscripción y planes (todos los endpoints necesarios para el flujo de pago)
          '/api/subscriptions/plans',
          '/api/subscriptions/current',
          '/api/subscriptions/create-temp',
          '/api/subscriptions/change-plan',
          '/api/subscriptions/process-upgrade-payment',
          '/api/subscriptions/process-downgrade-payment',
          '/api/subscriptions/cancel',

          // Auth y perfil
          '/api/auth/profile',
          '/api/auth/logout',

          // Configuración básica
          '/api/config/business',
          '/api/config/plan-usage',
          '/api/config/working-hours',
          '/api/config/holidays',

          // Dashboard básico
          '/api/dashboard/stats'
        ];

        // Usar startsWith para soportar URLs con parámetros (ej: /api/mercadopago/payment-status/:id)
        const isAllowed = allowedEndpoints.some(endpoint => req.originalUrl.startsWith(endpoint));

        if (!isAllowed) {
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
    console.error('Authentication error:', error.message);
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