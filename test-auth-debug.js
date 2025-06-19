const fetch = require('node-fetch');

console.log('🔍 === DIAGNÓSTICO DE AUTENTICACIÓN ===\n');

const API_BASE_URL = 'https://turnio-backend-production.up.railway.app/api';

// Función para extraer token de cookie
function extractTokenFromCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
  return tokenMatch ? tokenMatch[1] : null;
}

async function testAuth() {
  try {
    // PASO 1: Crear negocio y obtener token
    console.log('🏢 PASO 1: Creando negocio de prueba...');
    const registerData = {
      businessName: 'Test Auth Debug',
      email: `test.auth.${Date.now()}@example.com`,
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

    // PASO 2: Crear suscripción real
    console.log('\n💳 PASO 2: Creando suscripción real...');
    const subscriptionData = {
      businessId: businessId,
      planType: 'PREMIUM',
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

    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.json();
      throw new Error(`Creación de suscripción falló: ${errorData.message || subscriptionResponse.status}`);
    }

    const subscriptionResult = await subscriptionResponse.json();
    const subscriptionId = subscriptionResult.data.subscription.id;

    console.log('✅ Suscripción creada exitosamente');
    console.log('🎯 Subscription ID:', subscriptionId);
    console.log('📊 Estado inicial:', subscriptionResult.data.subscription.status);

    // PASO 3: Probar endpoint de pago con suscripción real
    console.log('\n💳 PASO 3: Probando endpoint de pago...');
    
    const paymentData = {
      subscriptionId: subscriptionId,
      amount: 9900,
      billingCycle: 'MONTHLY'
    };

    // Probar con Authorization header
    console.log('🔍 Probando con Authorization header...');
    const paymentResponse = await fetch(`${API_BASE_URL}/mercadopago/create-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    });

    console.log('📊 Status:', paymentResponse.status);
    
    const responseText = await paymentResponse.text();
    console.log('📋 Respuesta completa:', responseText);

    // Intentar parsear como JSON si es posible
    try {
      const responseJson = JSON.parse(responseText);
      console.log('📋 Respuesta JSON:', responseJson);
      
      if (paymentResponse.ok) {
        console.log('✅ ¡ÉXITO! El endpoint de pago funciona correctamente');
        console.log('🎯 Preference ID:', responseJson.data?.preferenceId);
        console.log('🔗 Init Point:', responseJson.data?.initPoint);
      } else {
        console.log('❌ El endpoint aún tiene problemas');
      }
    } catch (e) {
      console.log('📋 Respuesta no es JSON válido');
    }

  } catch (error) {
    console.error('\n❌ Error durante el diagnóstico:', error.message);
  }
}

// Ejecutar diagnóstico
testAuth(); 