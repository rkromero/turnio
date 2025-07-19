// Setup global para tests de Jest
require('dotenv').config({ path: '.env.test' });

// Configurar timeout global para tests que requieren base de datos
jest.setTimeout(30000);

// Mock de console.log para tests silenciosos
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup para manejar promesas no rechazadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Variables de entorno por defecto para tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

console.info('🧪 Jest setup completed - Ready for testing!'); 