#!/usr/bin/env node

const { spawn } = require('child_process');
const { fixRailwayDatabase } = require('./railway-fix');

async function startServer() {
  console.log('🚀 Iniciando TurnIO Backend en Railway...');
  
  try {
    // 1. Ejecutar el script de corrección
    console.log('🔧 Ejecutando corrección de base de datos...');
    await fixRailwayDatabase();
    console.log('✅ Corrección completada');
    
    // 2. Iniciar el servidor principal
    console.log('🌐 Iniciando servidor Express...');
    const server = spawn('node', ['src/index.js'], {
      stdio: 'inherit',
      env: process.env
    });

    server.on('close', (code) => {
      console.log(`💀 Servidor terminó con código: ${code}`);
      process.exit(code);
    });

    server.on('error', (error) => {
      console.error('❌ Error del servidor:', error);
      process.exit(1);
    });

    // Manejar señales de terminación
    process.on('SIGTERM', () => {
      console.log('📡 Recibida señal SIGTERM, cerrando servidor...');
      server.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      console.log('📡 Recibida señal SIGINT, cerrando servidor...');
      server.kill('SIGINT');
    });

  } catch (error) {
    console.error('❌ Error durante el inicio:', error);
    
    // Si el fix falla, intentar iniciar el servidor de todas formas
    console.log('⚠️ Iniciando servidor sin corrección...');
    const server = spawn('node', ['src/index.js'], {
      stdio: 'inherit',
      env: process.env
    });

    server.on('close', (code) => {
      process.exit(code);
    });
  }
}

startServer(); 