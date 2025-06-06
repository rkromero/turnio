#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Iniciando build process para TurnIO...');

try {
  // Limpiar cache de Prisma
  console.log('🧹 Limpiando cache de Prisma...');
  try {
    execSync('rm -rf node_modules/.prisma', { stdio: 'inherit' });
  } catch (e) {
    // Ignorar si no existe
  }

  // Generar cliente Prisma
  console.log('⚡ Generando cliente Prisma...');
  execSync('npx prisma generate --schema=./prisma/schema.prisma', { 
    stdio: 'inherit',
    cwd: __dirname 
  });

  // Verificar que se generó correctamente
  console.log('✅ Verificando cliente Prisma...');
  const { PrismaClient } = require('@prisma/client');
  const client = new PrismaClient();
  console.log('✅ Cliente Prisma generado correctamente');
  
  console.log('🎉 Build completado exitosamente!');
} catch (error) {
  console.error('❌ Error en build process:', error.message);
  process.exit(1);
} 