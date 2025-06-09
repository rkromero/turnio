// Script simple para migrar usuarios usando fetch
const https = require('https');

// 🔑 ACTUALIZA ESTE TOKEN CON EL TUYO ACTUAL
const JWT_TOKEN = 'PEGA_TU_TOKEN_AQUI';

console.log('🔧 Script de Migración de Usuarios - Turnio');
console.log('📝 Instrucciones para obtener token:');
console.log('   1. Ve a: https://turnio-frontend-production.up.railway.app');
console.log('   2. Inicia sesión');
console.log('   3. Abre DevTools (F12) → Application → Local Storage');
console.log('   4. Copia el token y reemplázalo en este script');
console.log('   5. Ejecuta: node migrate-simple.js\n');

if (JWT_TOKEN === 'PEGA_TU_TOKEN_AQUI') {
  console.log('❌ ERROR: Debes actualizar el JWT_TOKEN en el script');
  console.log('📝 Edita migrate-simple.js y reemplaza JWT_TOKEN con tu token actual');
  process.exit(1);
}

async function checkUserStats() {
  console.log('🔍 Verificando estado de usuarios...');
  
  const options = {
    hostname: 'turnio-backend-production.up.railway.app',
    port: 443,
    path: '/api/migration/user-branch-stats',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('📊 Estado actual:', JSON.stringify(result, null, 2));
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function migrateUsers() {
  console.log('🚀 Ejecutando migración de usuarios...');
  
  const options = {
    hostname: 'turnio-backend-production.up.railway.app',
    port: 443,
    path: '/api/migration/migrate-users-to-branches',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ Resultado de migración:', JSON.stringify(result, null, 2));
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    // 1. Verificar estado
    const stats = await checkUserStats();
    
    if (stats.success && stats.data.needsMigration) {
      console.log(`\n⚠️ Se encontraron ${stats.data.usersWithoutBranch} usuarios sin sucursal`);
      console.log('🔄 Iniciando migración automática...\n');
      
      // 2. Ejecutar migración
      const migrationResult = await migrateUsers();
      
      if (migrationResult.success) {
        console.log('\n🎉 ¡Migración completada exitosamente!');
        console.log(`📊 Usuarios migrados: ${migrationResult.data.totalUsersMigrated}`);
        console.log(`🏢 Negocios procesados: ${migrationResult.data.totalBusinesses}`);
      } else {
        console.log('❌ Error en la migración:', migrationResult.message);
      }
    } else {
      console.log('✅ No hay usuarios que necesiten migración');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main(); 