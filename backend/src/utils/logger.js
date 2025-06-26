const winston = require('winston');

// Lista de campos sensibles que nunca deben ser loggeados
const SENSITIVE_FIELDS = [
  'password', 'token', 'access_token', 'refresh_token', 'mp_access_token', 
  'mp_refresh_token', 'jwt', 'authorization', 'cookie', 'secret', 'key',
  'mp_client_secret', 'webhook_secret', 'credit_card', 'cvv', 'ssn'
];

// Función para filtrar datos sensibles
const sanitizeData = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Si el campo es sensible, ocultarlo
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else if (typeof value === 'string' && value.length > 50) {
      // Truncar strings muy largos que podrían ser tokens
      sanitized[key] = value.substring(0, 20) + '...[TRUNCATED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Configurar winston
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      // Sanitizar metadata
      const sanitizedMeta = sanitizeData(meta);
      
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...sanitizedMeta
      });
    })
  ),
  defaultMeta: { service: 'turnio-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// En producción, agregar file transport con rotación
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Función segura para logging
const safeLog = (level, message, data = {}) => {
  const sanitizedData = sanitizeData(data);
  logger[level](message, sanitizedData);
};

// Funciones de conveniencia
const logInfo = (message, data) => safeLog('info', message, data);
const logError = (message, error, data = {}) => {
  const errorData = {
    ...data,
    error: {
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }
  };
  safeLog('error', message, errorData);
};
const logWarning = (message, data) => safeLog('warn', message, data);
const logDebug = (message, data) => safeLog('debug', message, data);

// Log de auditoría para acciones críticas
const logAudit = (action, userId, businessId, details = {}) => {
  safeLog('info', `AUDIT: ${action}`, {
    audit: true,
    action,
    userId,
    businessId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

module.exports = {
  logger,
  safeLog,
  logInfo,
  logError,
  logWarning,
  logDebug,
  logAudit,
  sanitizeData
}; 