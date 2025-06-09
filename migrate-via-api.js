require('dotenv').config();
const fetch = require('node-fetch');

// Configuración
const API_BASE = 'http://localhost:3001/api';

// Función para hacer login y obtener token
async function login() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    
    // Necesitas proporcionar credenciales de un usuario admin existente
    const loginData = {
      email: 'admin@example.com', // CAMBIAR POR TU EMAIL ADMIN
      password: 'Admin123!'        // CAMBIAR POR TU CONTRASEÑA
    };

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error de login: ${data.message}`);
    }

    // Extraer token de las cookies
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
      if (tokenMatch) {
        return tokenMatch[1];
      }
    }

    throw new Error('No se pudo extraer el token de la respuesta');
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    throw error;
  }
}

// Función para ejecutar la migración
async function migrateUsers(token) {
  try {
    console.log('🚀 Ejecutando migración de usuarios...');
    
    const response = await fetch(`${API_BASE}/migration/migrate-users-to-branches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error en migración: ${data.message}`);
    }

    console.log('✅ Migración completada exitosamente:');
    console.log(`📊 Total de negocios: ${data.data.totalBusinesses}`);
    console.log(`👥 Usuarios migrados: ${data.data.totalUsersMigrated}`);
    console.log(`⚠️  Usuarios restantes sin sucursal: ${data.data.remainingUsersWithoutBranch}`);
    
    if (data.data.businessResults.length > 0) {
      console.log('\n📋 Detalles por negocio:');
      data.data.businessResults.forEach(result => {
        console.log(`  🏢 ${result.businessName}:`);
        console.log(`     - Usuarios migrados: ${result.usersMigrated}`);
        console.log(`     - Sucursal: ${result.branchName}`);
        if (result.branchCreated) {
          console.log(`     - ✨ Sucursal creada automáticamente`);
        }
      });
    }

    return data;
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    throw error;
  }
}

// Función principal
async function main() {
  try {
    console.log('🔧 Script de Migración de Usuarios - Turnio');
    console.log('===============================================\n');
    
    const token = await login();
    console.log('✅ Token obtenido exitosamente\n');
    
    await migrateUsers(token);
    
    console.log('\n🎉 ¡Migración completada exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  }
}

// Ejecutar si este archivo se llama directamente
if (require.main === module) {
  main();
}

module.exports = { login, migrateUsers }; 