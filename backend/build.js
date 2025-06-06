#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Iniciando build del backend TurnIO...');

try {
  // Verificar si necesitamos limpiar node_modules (cambio de Express)
  console.log('📦 Verificando dependencias...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const needsCleanInstall = packageJson.dependencies.express?.startsWith('^4.');
  
  if (needsCleanInstall && fs.existsSync('node_modules')) {
    console.log('🧹 Limpiando node_modules para actualización de Express...');
    fs.rmSync('node_modules', { recursive: true, force: true });
    if (fs.existsSync('package-lock.json')) {
      fs.unlinkSync('package-lock.json');
    }
  }

  // Instalar dependencias
  if (!fs.existsSync('node_modules')) {
    console.log('⚡ Instalando dependencias...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // Limpiar cache de Prisma
  console.log('🧹 Limpiando cache de Prisma...');
  try {
    fs.rmSync('node_modules/.prisma', { recursive: true, force: true });
  } catch (e) {
    // No problem if it doesn't exist
  }

  // Generar cliente de Prisma
  console.log('⚡ Generando cliente de Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Verificar que Prisma se generó correctamente
  const prismaClientPath = path.join('node_modules', '.prisma', 'client', 'index.js');
  if (!fs.existsSync(prismaClientPath)) {
    throw new Error('Cliente de Prisma no se generó correctamente');
  }

  console.log('✅ Build del backend completado exitosamente!');
  console.log('🔗 Express version:', packageJson.dependencies.express);
  console.log('📁 Cliente Prisma generado en:', prismaClientPath);
  
} catch (error) {
  console.error('❌ Error en build del backend:', error.message);
  process.exit(1);
} 