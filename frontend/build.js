#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔧 Iniciando build del frontend TurnIO...');

try {
  // Verificar que las dependencias estén instaladas
  console.log('📦 Verificando dependencias...');
  
  // Verificar archivos importantes
  console.log('📋 Verificando configuración...');
  const requiredFiles = ['package.json', 'vite.config.ts', 'tsconfig.json'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Archivo requerido faltante: ${file}`);
    }
  }

  // Limpiar build anterior
  console.log('🧹 Limpiando build anterior...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // Configurar variables de entorno para el build
  const buildEnv = {
    ...process.env,
    NODE_ENV: 'production',
    VITE_API_URL: process.env.VITE_API_URL || 'https://turnio-backend-production.up.railway.app/api'
  };

  console.log('🌐 Configurando API URL:', buildEnv.VITE_API_URL);

  // Build con configuración específica para Railway
  console.log('⚡ Ejecutando build de Vite...');
  execSync('npx tsc -b && npx vite build --mode production', { 
    stdio: 'inherit',
    env: buildEnv
  });

  // Verificar que el build se creó correctamente
  if (!fs.existsSync('dist/index.html')) {
    throw new Error('Build falló: no se generó dist/index.html');
  }

  // Copiar archivos adicionales del directorio public si no se copiaron automáticamente
  console.log('📋 Verificando archivos públicos...');
  const publicFiles = ['manifest.json', 'sw.js'];
  for (const file of publicFiles) {
    const srcPath = path.join('public', file);
    const destPath = path.join('dist', file);
    
    if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
      console.log(`📄 Copiando ${file}...`);
      fs.copyFileSync(srcPath, destPath);
    } else if (fs.existsSync(destPath)) {
      console.log(`✅ ${file} ya existe en dist/`);
    } else {
      console.log(`⚠️  ${file} no encontrado en public/`);
    }
  }

  console.log('✅ Build del frontend completado exitosamente!');
  console.log('📁 Archivos generados en ./dist/');
  
  // Mostrar información del build
  const distStats = fs.readdirSync('dist');
  console.log('📋 Archivos generados:', distStats.join(', '));
  
} catch (error) {
  console.error('❌ Error en build del frontend:', error.message);
  console.error('📊 Detalles del error:', error);
  process.exit(1);
} 