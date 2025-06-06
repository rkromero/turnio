const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Función para verificar y generar Prisma Client si es necesario
const ensurePrismaClient = async () => {
  try {
    // Verificar si el cliente de Prisma existe
    const prismaClientPath = path.join(__dirname, '../../node_modules/.prisma/client');
    
    if (!fs.existsSync(prismaClientPath)) {
      console.log('⚡ Generando cliente de Prisma...');
      execSync('npx prisma generate --schema=./prisma/schema.prisma', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '../..')
      });
      console.log('✅ Cliente de Prisma generado exitosamente');
    }
  } catch (error) {
    console.log('⚠️ Cliente de Prisma podría no estar generado, continuando...');
  }
};

// Configuración más robusta para Railway
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'minimal',
});

// Función para conectar a la base de datos
const connectDatabase = async () => {
  try {
    // Asegurar que Prisma Client esté generado
    await ensurePrismaClient();
    
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos PostgreSQL');
    
    // Verificar que la conexión funciona
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Base de datos accesible y funcionando');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    throw error;
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