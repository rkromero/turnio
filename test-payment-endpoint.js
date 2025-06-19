const fetch = require('node-fetch');

console.log('🔍 === DIAGNÓSTICO DEL ENDPOINT DE PAGO ===\n');

const API_BASE_URL = 'https://turnio-backend-production.up.railway.app/api';

// Función para extraer token de cookie
function extractTokenFromCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
  return tokenMatch ? tokenMatch[1] : null;
}

async function testPaymentEndpoint() {
  try {
    // PASO 1: Crear negocio de prueba
    console.log('🏢 PASO 1: Creando negocio de prueba...');
    const registerData = {
      businessName: 'Negocio Test Pago',
      email: `test.pago.${Date.now()}@example.com`,
      password: 'Test123!',
      phone: '1234567890',
      address: 'Dirección de Prueba Pago 123',
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
    console.log('🔐 Token obtenido:', token ? 'SÍ' : 'NO');

    if (!token) {
      throw new Error('No se pudo obtener token de autenticación');
    }

    // PASO 2: Crear suscripción de prueba
    console.log('\n💳 PASO 2: Creando suscripción de prueba...');
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

    // PASO 3: Verificar estado de la suscripción
    console.log('\n📊 PASO 3: Verificando estado de la suscripción...');
    
    const currentSubscriptionResponse = await fetch(`${API_BASE_URL}/subscriptions/current`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Cookie': `token=${token}`
      }
    });

    if (currentSubscriptionResponse.ok) {
      const currentSubscriptionData = await currentSubscriptionResponse.json();
      console.log('✅ Estado de suscripción obtenido');
      console.log('📊 Estado:', currentSubscriptionData.data?.status);
      console.log('💳 Plan:', currentSubscriptionData.data?.planType);
    } else {
      console.log('⚠️  Error al obtener suscripción actual:', currentSubscriptionResponse.status);
      const errorText = await currentSubscriptionResponse.text();
      console.log('📋 Error detallado:', errorText);
    }

    // PASO 4: Probar endpoint de pago con diferentes headers
    console.log('\n💳 PASO 4: Probando endpoint de pago...');
    
    const paymentData = {
      subscriptionId: subscriptionId,
      amount: 9900,
      billingCycle: 'MONTHLY'
    };

    // Probar con Authorization header
    console.log('🔍 Probando con Authorization header...');
    const paymentResponse1 = await fetch(`${API_BASE_URL}/mercadopago/create-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    });

    console.log('📊 Status con Authorization:', paymentResponse1.status);
    if (!paymentResponse1.ok) {
      const errorData1 = await paymentResponse1.json();
      console.log('❌ Error con Authorization:', errorData1);
    } else {
      const result1 = await paymentResponse1.json();
      console.log('✅ Éxito con Authorization:', result1.success);
    }

    // Probar con Cookie header
    console.log('\n🔍 Probando con Cookie header...');
    const paymentResponse2 = await fetch(`${API_BASE_URL}/mercadopago/create-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`
      },
      body: JSON.stringify(paymentData)
    });

    console.log('📊 Status con Cookie:', paymentResponse2.status);
    if (!paymentResponse2.ok) {
      const errorData2 = await paymentResponse2.json();
      console.log('❌ Error con Cookie:', errorData2);
    } else {
      const result2 = await paymentResponse2.json();
      console.log('✅ Éxito con Cookie:', result2.success);
    }

    // Probar con ambos headers
    console.log('\n🔍 Probando con ambos headers...');
    const paymentResponse3 = await fetch(`${API_BASE_URL}/mercadopago/create-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': `token=${token}`
      },
      body: JSON.stringify(paymentData)
    });

    console.log('📊 Status con ambos headers:', paymentResponse3.status);
    if (!paymentResponse3.ok) {
      const errorData3 = await paymentResponse3.json();
      console.log('❌ Error con ambos headers:', errorData3);
    } else {
      const result3 = await paymentResponse3.json();
      console.log('✅ Éxito con ambos headers:', result3.success);
    }

    // PASO 5: Verificar logs del servidor
    console.log('\n📋 PASO 5: Resumen del diagnóstico...');
    console.log('🔍 El problema parece estar en el middleware de autenticación');
    console.log('💡 Posibles causas:');
    console.log('   1. El middleware está usando authenticateToken en lugar de authenticateTokenOnly');
    console.log('   2. La suscripción se está creando en estado PAYMENT_FAILED');
    console.log('   3. El middleware está bloqueando el acceso al endpoint de pago');
    console.log('   4. Hay un problema con la configuración de rutas');

  } catch (error) {
    console.error('\n❌ Error durante el diagnóstico:', error.message);
  }
}

// Ejecutar diagnóstico
testPaymentEndpoint(); 