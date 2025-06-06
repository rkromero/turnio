#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Iniciando build del frontend TurnIO...');

try {
  // Verificar que las dependencias estén instaladas
  console.log('📦 Verificando dependencias...');
  if (!fs.existsSync('node_modules')) {
    console.log('⚡ Instalando dependencias...');
    execSync('npm install', { stdio: 'inherit' });
  }

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

  // Build con configuración específica para Railway
  console.log('⚡ Ejecutando build de Vite...');
  execSync('npx vite build --mode production', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3000'
    }
  });

  // Verificar que el build se creó correctamente
  if (!fs.existsSync('dist/index.html')) {
    throw new Error('Build falló: no se generó dist/index.html');
  }

  console.log('✅ Build del frontend completado exitosamente!');
  console.log('📁 Archivos generados en ./dist/');
  
} catch (error) {
  console.error('❌ Error en build del frontend:', error.message);
  process.exit(1);
} 