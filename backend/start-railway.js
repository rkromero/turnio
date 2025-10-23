#!/usr/bin/env node

/**
 * Script de inicio simplificado para Railway
 * Inicia directamente el servidor sin configuración compleja
 */

console.log('🚀 Iniciando TurnIO en Railway...');
console.log('📊 Ambiente:', process.env.NODE_ENV || 'production');
console.log('🔗 Puerto:', process.env.PORT || 3000);

// Iniciar el servidor directamente
try {
  require('./src/index.js');
} catch (error) {
  console.error('❌ Error iniciando servidor:', error);
  process.exit(1);
}
