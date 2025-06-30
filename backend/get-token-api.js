const axios = require('axios');

const RAILWAY_API = {
  backend: 'https://turnio-backend-production.up.railway.app'
};

async function obtenerTokenViaAPI() {
  try {
    console.log('🔐 === OBTENER TOKEN VIA API ===\n');

    // Credenciales que veo en tu captura
    const credentials = {
      email: 'prueba4@real.com',
      password: '' // Lo necesitamos
    };

    console.log('📧 Email detectado:', credentials.email);
    console.log('🔑 Necesitamos la contraseña para hacer login via API');
    
    // Pedir contraseña como argumento
    const password = process.argv[2];
    
    if (!password) {
      console.log('\n⚠️ FALTA LA CONTRASEÑA');
      console.log('Ejecuta: node get-token-api.js TU_CONTRASEÑA');
      console.log('Ejemplo: node get-token-api.js micontraseña123');
      return;
    }

    credentials.password = password;

    console.log('\n1️⃣ Intentando login via API...');
    
    // Hacer login
    const loginResponse = await axios.post(`${RAILWAY_API.backend}/api/auth/login`, credentials, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Login exitoso!');
    
    const token = loginResponse.data.token;
    
    if (token) {
      console.log('\n🎉 TOKEN OBTENIDO:');
      console.log('📋 Token JWT:', token);
      
      // Mostrar información del usuario
      console.log('\n👤 Información del usuario:');
      console.log('📧 Email:', loginResponse.data.user.email);
      console.log('🏢 Negocio:', loginResponse.data.user.business?.name || 'N/A');
      console.log('💳 Plan:', loginResponse.data.user.business?.planType || 'N/A');
      
      console.log('\n🚀 AHORA PUEDES PROBAR EL COBRO AUTOMÁTICO:');
      console.log(`node test-cobro-automatico-api.js ${token}`);
      
    } else {
      console.log('❌ No se recibió token en la respuesta');
      console.log('Respuesta completa:', loginResponse.data);
    }

  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 CREDENCIALES INCORRECTAS');
      console.log('Verifica que la contraseña sea correcta');
    } else if (error.response?.status === 404) {
      console.log('\n👤 USUARIO NO ENCONTRADO');
      console.log('Verifica que el email sea correcto');
    }
  }
}

obtenerTokenViaAPI(); 