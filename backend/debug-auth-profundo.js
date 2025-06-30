const axios = require('axios');

const RAILWAY_API = {
  backend: 'https://turnio-backend-production.up.railway.app'
};

async function diagnosticarAuthProfundo() {
  try {
    console.log('🔬 === DIAGNÓSTICO PROFUNDO DE AUTENTICACIÓN ===\n');

    const email = 'prueba4@real.com';
    const password = 'Mon$$123';

    console.log('📧 Email a probar:', email);
    console.log('🔑 Contraseña a probar:', password);
    console.log('🔍 Caracteres especiales en contraseña:', password.includes('$') ? 'SÍ ($$)' : 'NO');

    // 1. Probar el endpoint de login con debug completo
    console.log('\n1️⃣ === PROBANDO LOGIN CON DEBUG COMPLETO ===');
    
    try {
      const loginResponse = await axios.post(`${RAILWAY_API.backend}/api/auth/login`, {
        email: email,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Testing-Script'
        },
        validateStatus: () => true // No arrojar error en respuestas 4xx/5xx
      });

      console.log('📊 Status Code:', loginResponse.status);
      console.log('📋 Response Headers:', Object.keys(loginResponse.headers));
      console.log('📄 Response Data:', JSON.stringify(loginResponse.data, null, 2));

      if (loginResponse.status === 200 && loginResponse.data.token) {
        console.log('\n✅ LOGIN EXITOSO!');
        console.log('🎉 Token obtenido:', loginResponse.data.token.substring(0, 20) + '...');
        return loginResponse.data.token;
      }

    } catch (error) {
      console.log('❌ Error en request:', error.message);
      if (error.response) {
        console.log('📊 Error Status:', error.response.status);
        console.log('📄 Error Data:', error.response.data);
      }
    }

    // 2. Probar con diferentes codificaciones de la contraseña
    console.log('\n2️⃣ === PROBANDO DIFERENTES CODIFICACIONES ===');
    
    const passwordVariants = [
      'Mon$$123',           // Original
      'Mon$$$123',          // Con triple $
      'Mon\\$\\$123',       // Escapado
      'Mon%24%24123',       // URL encoded
      'Mon&dollar;&dollar;123' // HTML encoded
    ];

    for (const variant of passwordVariants) {
      try {
        console.log(`🔍 Probando: "${variant}"`);
        
        const response = await axios.post(`${RAILWAY_API.backend}/api/auth/login`, {
          email: email,
          password: variant
        }, {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true
        });

        if (response.status === 200) {
          console.log(`✅ FUNCIONA con: "${variant}"`);
          console.log('🎉 Token:', response.data.token?.substring(0, 20) + '...');
          return response.data.token;
        } else {
          console.log(`❌ Falló con: "${variant}" - ${response.data?.message}`);
        }
      } catch (error) {
        console.log(`❌ Error con "${variant}":`, error.message);
      }
    }

    // 3. Verificar si hay problema con el endpoint de auth
    console.log('\n3️⃣ === VERIFICANDO ENDPOINT AUTH ===');
    
    try {
      const healthResponse = await axios.get(`${RAILWAY_API.backend}/api/auth/profile`, {
        headers: {
          'Authorization': 'Bearer token_invalido_para_test'
        },
        validateStatus: () => true
      });
      
      console.log('📊 Auth endpoint status:', healthResponse.status);
      console.log('📄 Auth endpoint response:', healthResponse.data);
      
      if (healthResponse.status === 401) {
        console.log('✅ Auth endpoint funciona (rechaza token inválido)');
      }
    } catch (error) {
      console.log('❌ Auth endpoint error:', error.message);
    }

    // 4. Intentar con registro nuevo para comparar
    console.log('\n4️⃣ === PROBANDO REGISTRO NUEVO PARA COMPARAR ===');
    
    const testUser = {
      name: 'Test Debug User',
      email: `test.debug.${Date.now()}@example.com`,
      phone: '1234567890',
      password: 'Mon$$123', // Misma contraseña
      businessName: 'Test Debug Business',
      businessType: 'HEALTH'
    };

    try {
      console.log('📝 Registrando usuario test:', testUser.email);
      
      const registerResponse = await axios.post(`${RAILWAY_API.backend}/api/auth/register`, testUser, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      });

      console.log('📊 Register status:', registerResponse.status);
      
      if (registerResponse.status === 201 || registerResponse.status === 200) {
        console.log('✅ Registro exitoso');
        
        // Ahora probar login inmediato
        console.log('🔄 Probando login inmediato con el mismo usuario...');
        
        const immediateLoginResponse = await axios.post(`${RAILWAY_API.backend}/api/auth/login`, {
          email: testUser.email,
          password: testUser.password
        }, {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true
        });

        console.log('📊 Immediate login status:', immediateLoginResponse.status);
        
        if (immediateLoginResponse.status === 200) {
          console.log('✅ Login inmediato FUNCIONA');
          console.log('🎉 Esto confirma que el sistema auth funciona');
          console.log('🤔 El problema está específicamente con el usuario prueba4@real.com');
          
          console.log('\n💡 SOLUCIONES POSIBLES:');
          console.log('1. Usar este usuario nuevo para la prueba');
          console.log('2. Resetear la contraseña del usuario original');
          console.log('3. Investigar la base de datos directamente');
          
          return immediateLoginResponse.data.token;
        } else {
          console.log('❌ Login inmediato falló:', immediateLoginResponse.data);
        }
      } else {
        console.log('❌ Registro falló:', registerResponse.data);
      }
    } catch (error) {
      console.log('❌ Error en registro:', error.response?.data || error.message);
    }

    console.log('\n🎯 CONCLUSIÓN:');
    console.log('El problema parece ser específico del usuario prueba4@real.com');
    console.log('Recomendación: Usar el usuario recién creado para continuar con la prueba');

  } catch (error) {
    console.error('❌ Error general en diagnóstico:', error.message);
  }
}

diagnosticarAuthProfundo(); 