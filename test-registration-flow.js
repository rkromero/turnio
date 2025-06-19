const fetch = require('node-fetch');

console.log('🧪 === PRUEBA DEL FLUJO DE REGISTRO Y AUTENTICACIÓN ===\n');

const API_BASE_URL = 'https://turnio-backend-production.up.railway.app/api';

// Función para extraer token de cookie
function extractTokenFromCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  
  const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
  return tokenMatch ? tokenMatch[1] : null;
}

async function testRegistrationFlow() {
  try {
    // PASO 1: Verificar que la API esté funcionando
    console.log('🔧 PASO 1: Verificando que la API esté funcionando...');
    const healthResponse = await fetch(`${API_BASE_URL}/subscriptions/plans`);
    if (healthResponse.ok) {
      console.log('✅ API funcionando correctamente');
    } else {
      throw new Error(`API no responde: ${healthResponse.status}`);
    }

    // PASO 2: Crear negocio de prueba
    console.log('\n🏢 PASO 2: Creando negocio de prueba...');
    const registerData = {
      businessName: 'Negocio Prueba Flujo',
      email: `test.flujo.${Date.now()}@example.com`,
      password: 'Test123!',
      phone: '1234567890',
      address: 'Dirección de Prueba Flujo 123',
      businessType: 'GENERAL'
    };

    console.log('📋 Datos de registro:', {
      businessName: registerData.businessName,
      email: registerData.email,
      phone: registerData.phone
    });

    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });

    console.log('📊 Status del registro:', registerResponse.status);
    
    // Extraer token de la cookie
    const setCookieHeader = registerResponse.headers.get('set-cookie');
    console.log('🍪 Set-Cookie header:', setCookieHeader);
    
    const token = extractTokenFromCookie(setCookieHeader);
    console.log('🔐 Token extraído de cookie:', token ? 'SÍ' : 'NO');
    console.log('🔐 Token (primeros 20 chars):', token ? token.substring(0, 20) + '...' : 'NO TOKEN');

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json();
      console.log('❌ Error en registro:', errorData);
      throw new Error(`Registro falló: ${errorData.message || registerResponse.status}`);
    }

    const registerResult = await registerResponse.json();
    console.log('📋 Respuesta del registro:', JSON.stringify(registerResult, null, 2));

    const businessId = registerResult.data?.business?.id;

    console.log('✅ Negocio creado exitosamente');
    console.log('🎯 Business ID:', businessId);

    if (!token) {
      console.log('⚠️  No se obtuvo token del registro. Intentando login...');
      
      // Intentar login
      const loginData = {
        email: registerData.email,
        password: registerData.password
      };

      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      if (loginResponse.ok) {
        const loginSetCookieHeader = loginResponse.headers.get('set-cookie');
        const loginToken = extractTokenFromCookie(loginSetCookieHeader);
        
        console.log('✅ Login exitoso');
        console.log('🔐 Token del login:', loginToken ? 'SÍ' : 'NO');
        
        if (loginToken) {
          console.log('🔐 Token (primeros 20 chars):', loginToken.substring(0, 20) + '...');
          
          // Probar el token
          console.log('\n🔐 Probando token del login...');
          const testResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 
              'Authorization': `Bearer ${loginToken}`,
              'Cookie': `token=${loginToken}`
            }
          });

          if (testResponse.ok) {
            console.log('✅ Token del login funciona correctamente');
            return { businessId, token: loginToken };
          } else {
            console.log('❌ Token del login no funciona:', testResponse.status);
          }
        }
      } else {
        console.log('❌ Login falló:', loginResponse.status);
      }
    } else {
      // Probar el token del registro
      console.log('\n🔐 Probando token del registro...');
      const testResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cookie': `token=${token}`
        }
      });

      if (testResponse.ok) {
        console.log('✅ Token del registro funciona correctamente');
        return { businessId, token };
      } else {
        console.log('❌ Token del registro no funciona:', testResponse.status);
        console.log('📋 Respuesta del test:', await testResponse.text());
      }
    }

    throw new Error('No se pudo obtener un token válido');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error.message);
    console.error('💡 Verifica que el backend esté desplegado correctamente');
    throw error;
  }
}

async function testSubscriptionCreation(businessId, token) {
  try {
    console.log('\n💳 === PRUEBA DE CREACIÓN DE SUSCRIPCIÓN ===');
    
    // PASO 1: Crear suscripción
    console.log('\n💳 PASO 1: Creando suscripción...');
    const subscriptionData = {
      businessId: businessId,
      planType: 'BASIC',
      billingCycle: 'MONTHLY'
    };

    const subscriptionResponse = await fetch(`${API_BASE_URL}/subscriptions/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': `token=${token}`
      },
      body: JSON.stringify(subscriptionData)
    });

    console.log('📊 Status de suscripción:', subscriptionResponse.status);

    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.json();
      console.log('❌ Error en suscripción:', errorData);
      throw new Error(`Creación de suscripción falló: ${errorData.message || subscriptionResponse.status}`);
    }

    const subscriptionResult = await subscriptionResponse.json();
    console.log('📋 Respuesta de suscripción:', JSON.stringify(subscriptionResult, null, 2));

    const subscriptionId = subscriptionResult.data?.id;
    console.log('✅ Suscripción creada exitosamente');
    console.log('🎯 Subscription ID:', subscriptionId);

    return subscriptionId;

  } catch (error) {
    console.error('\n❌ Error en creación de suscripción:', error.message);
    throw error;
  }
}

// Ejecutar pruebas
async function runTests() {
  try {
    const { businessId, token } = await testRegistrationFlow();
    const subscriptionId = await testSubscriptionCreation(businessId, token);
    
    console.log('\n🎉 === PRUEBAS COMPLETADAS EXITOSAMENTE ===');
    console.log('✅ Registro: OK');
    console.log('✅ Autenticación: OK');
    console.log('✅ Creación de suscripción: OK');
    console.log('🎯 Business ID:', businessId);
    console.log('🎯 Subscription ID:', subscriptionId);
    
  } catch (error) {
    console.error('\n❌ Pruebas fallidas:', error.message);
  }
}

runTests(); 