const { logError } = require('../utils/logger');

// Middleware para manejo seguro de errores
const errorHandler = (err, req, res, next) => {
  // Log completo del error para debugging interno
  logError('Error en aplicación', err, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    businessId: req.businessId
  });

  // Determinar el código de estado
  let statusCode = err.statusCode || err.status || 500;
  
  // Mensaje genérico para producción
  let message = 'Error interno del servidor';
  
  // En desarrollo, mostrar más detalles
  if (process.env.NODE_ENV === 'development') {
    message = err.message || message;
  } else {
    // En producción, solo mostrar mensajes específicos para ciertos errores
    if (statusCode === 400) {
      message = 'Solicitud inválida';
    } else if (statusCode === 401) {
      message = 'No autorizado';
    } else if (statusCode === 403) {
      message = 'Acceso denegado';
    } else if (statusCode === 404) {
      message = 'Recurso no encontrado';
    } else if (statusCode === 429) {
      message = 'Demasiadas solicitudes. Intenta más tarde';
    } else if (statusCode === 422) {
      message = 'Datos de entrada inválidos';
    }
  }

  // Respuesta estándar de error
  const errorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Solo incluir stack trace en desarrollo
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Solo incluir detalles adicionales si son seguros
  if (err.errors && Array.isArray(err.errors)) {
    // Para errores de validación
    errorResponse.errors = err.errors.map(error => ({
      field: error.path || error.param,
      message: error.msg || error.message
    }));
  }

  res.status(statusCode).json(errorResponse);
};

// Middleware para capturar errores async no manejados
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware para rutas no encontradas
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Manejador de errores no capturados
const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (err) => {
    logError('Excepción no capturada', err);
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    logError('Promesa rechazada no manejada', err);
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    process.exit(1);
  });
};

module.exports = {
  errorHandler,
  asyncErrorHandler,
  notFoundHandler,
  handleUncaughtExceptions
}; 