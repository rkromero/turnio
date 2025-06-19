const fetch = require('node-fetch');

console.log('🔍 === DIAGNÓSTICO DE ORDEN DE RUTAS ===\n');

const API_BASE_URL = 'https://turnio-backend-production.up.railway.app/api';

// Función para extraer token de cookie
function extractTokenFromCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
  return tokenMatch ? tokenMatch[1] : null;
}

async function testRouteOrder() {
  try {
    // PASO 1: Crear negocio y obtener token
    console.log('🏢 PASO 1: Creando negocio de prueba...');
    const registerData = {
      businessName: 'Test Route Order',
      email: `test.route.${Date.now()}@example.com`,
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

    // PASO 3: Probar diferentes endpoints para ver qué middleware se aplica
    console.log('\n🔍 PASO 3: Probando diferentes endpoints...');
    
    const paymentData = {
      subscriptionId: subscriptionId,
      amount: 9900,
      billingCycle: 'MONTHLY'
    };

    // Probar endpoint que debería usar authenticateTokenOnly
    console.log('🔍 Probando /mercadopago/create-payment (debería usar authenticateTokenOnly)...');
    const createPaymentResponse = await fetch(`${API_BASE_URL}/mercadopago/create-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    });

    console.log('📊 Status create-payment:', createPaymentResponse.status);
    const createPaymentText = await createPaymentResponse.text();
    console.log('📋 Respuesta create-payment:', createPaymentText);

    // Probar endpoint que usa authenticateToken
    console.log('\n🔍 Probando /mercadopago/payment-status (usa authenticateToken)...');
    const paymentStatusResponse = await fetch(`${API_BASE_URL}/mercadopago/payment-status/test-id`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📊 Status payment-status:', paymentStatusResponse.status);
    const paymentStatusText = await paymentStatusResponse.text();
    console.log('📋 Respuesta payment-status:', paymentStatusText);

    // PASO 4: Análisis
    console.log('\n📋 PASO 4: Análisis de resultados...');
    
    if (createPaymentResponse.status === 403 && paymentStatusResponse.status === 403) {
      console.log('❌ AMBOS endpoints devuelven 403');
      console.log('💡 Esto sugiere que el middleware authenticateToken se está aplicando a AMBOS');
      console.log('💡 Posible problema: el orden de las rutas no está funcionando correctamente');
    } else if (createPaymentResponse.status === 200 && paymentStatusResponse.status === 403) {
      console.log('✅ create-payment funciona, payment-status bloqueado (comportamiento esperado)');
    } else if (createPaymentResponse.status === 403 && paymentStatusResponse.status === 200) {
      console.log('❌ create-payment bloqueado, payment-status funciona (comportamiento inesperado)');
    } else {
      console.log('❓ Comportamiento mixto - revisar configuración de rutas');
    }

  } catch (error) {
    console.error('\n❌ Error durante el diagnóstico:', error.message);
  }
}

// Ejecutar diagnóstico
testRouteOrder(); 