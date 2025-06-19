const fetch = require('node-fetch');

console.log('🔍 === DIAGNÓSTICO DE MIDDLEWARE ===\n');

const API_BASE_URL = 'https://turnio-backend-production.up.railway.app/api';

// Función para extraer token de cookie
function extractTokenFromCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
  return tokenMatch ? tokenMatch[1] : null;
}

async function testMiddleware() {
  try {
    // PASO 1: Crear negocio y obtener token
    console.log('🏢 PASO 1: Creando negocio de prueba...');
    const registerData = {
      businessName: 'Test Middleware Debug',
      email: `test.middleware.${Date.now()}@example.com`,
      password: 'Test123!',
      phone: '1234567890',
      address: 'Test Address 123',
      businessType: 'GENERAL'
    };

    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json();
      throw new Error(`Registro falló: ${errorData.message || registerResponse.status}`);
    }

    const registerResult = await registerResponse.json();
    const businessId = registerResult.data.business.id;
    const setCookieHeader = registerResponse.headers.get('set-cookie');
    const token = extractTokenFromCookie(setCookieHeader);

    console.log('✅ Negocio creado exitosamente');
    console.log('🎯 Business ID:', businessId);
    console.log('🔐 Token extraído:', token ? token.substring(0, 20) + '...' : 'NO');

    if (!token) {
      throw new Error('No se pudo obtener token de autenticación');
    }

    // PASO 2: Probar endpoint que usa authenticateTokenOnly (sin suscripción)
    console.log('\n🔍 PASO 2: Probando endpoint con authenticateTokenOnly...');
    
    // Probar con token válido
    console.log('🔍 Probando con token válido...');
    const testResponse1 = await fetch(`${API_BASE_URL}/mercadopago/create-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscriptionId: 'test-id',
        amount: 9900,
        billingCycle: 'MONTHLY'
      })
    });

    console.log('📊 Status con token válido:', testResponse1.status);
    const responseText1 = await testResponse1.text();
    console.log('📋 Respuesta con token válido:', responseText1);

    // Probar sin token
    console.log('\n🔍 Probando sin token...');
    const testResponse2 = await fetch(`${API_BASE_URL}/mercadopago/create-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriptionId: 'test-id',
        amount: 9900,
        billingCycle: 'MONTHLY'
      })
    });

    console.log('📊 Status sin token:', testResponse2.status);
    const responseText2 = await testResponse2.text();
    console.log('📋 Respuesta sin token:', responseText2);

    // Probar con token inválido
    console.log('\n🔍 Probando con token inválido...');
    const testResponse3 = await fetch(`${API_BASE_URL}/mercadopago/create-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      },
      body: JSON.stringify({
        subscriptionId: 'test-id',
        amount: 9900,
        billingCycle: 'MONTHLY'
      })
    });

    console.log('📊 Status con token inválido:', testResponse3.status);
    const responseText3 = await testResponse3.text();
    console.log('📋 Respuesta con token inválido:', responseText3);

    // PASO 3: Análisis
    console.log('\n📋 PASO 3: Análisis de resultados...');
    if (testResponse1.status === 403 && testResponse2.status === 401) {
      console.log('✅ El middleware authenticateTokenOnly funciona correctamente');
      console.log('❌ El problema está en otra parte (posiblemente en el controlador)');
    } else if (testResponse1.status === 403 && testResponse2.status === 403) {
      console.log('❌ El middleware authenticateTokenOnly está fallando');
      console.log('💡 Posible problema: el middleware no está verificando el token correctamente');
    } else {
      console.log('❓ Comportamiento inesperado del middleware');
    }

  } catch (error) {
    console.error('\n❌ Error durante el diagnóstico:', error.message);
  }
}

// Ejecutar diagnóstico
testMiddleware(); 