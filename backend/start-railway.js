#!/usr/bin/env node

/**
 * Script de inicio optimizado para Railway
 * Maneja la configuración de base de datos y el inicio del servidor
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function setupDatabase() {
  try {
    console.log('🔧 Configurando base de datos...');
    
    // Generar cliente Prisma
    console.log('📦 Generando cliente Prisma...');
    await execAsync('npx prisma generate');
    console.log('✅ Cliente Prisma generado');
    
    // Intentar sincronizar schema (no crítico si falla)
    try {
      console.log('🔄 Sincronizando schema...');
      await execAsync('npx prisma db push --accept-data-loss');
      console.log('✅ Schema sincronizado');
    } catch (error) {
      console.log('⚠️  Schema ya está sincronizado o hay un problema menor:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error configurando base de datos:', error.message);
    console.log('🔄 Continuando sin configuración de DB...');
    return false;
  }
}

async function startApplication() {
  try {
    console.log('🚀 Iniciando aplicación TurnIO...');
    
    // Configurar base de datos
    await setupDatabase();
    
    // Iniciar servidor
    console.log('🌐 Iniciando servidor...');
    require('./src/index.js');
    
  } catch (error) {
    console.error('❌ Error iniciando aplicación:', error);
    process.exit(1);
  }
}

// Manejo de señales para cierre graceful
process.on('SIGTERM', () => {
  console.log('🔄 Recibida señal SIGTERM, cerrando aplicación...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 Recibida señal SIGINT, cerrando aplicación...');
  process.exit(0);
});

// Iniciar la aplicación
startApplication();
