const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Función para conectar a la base de datos
const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos PostgreSQL');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  }
};

// Función para desconectar de la base de datos
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ Desconectado de la base de datos');
  } catch (error) {
    console.error('❌ Error desconectando de la base de datos:', error);
  }
};

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
}; 