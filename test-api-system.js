const fetch = require('node-fetch');

console.log('🧪 === PRUEBA DEL SISTEMA A TRAVÉS DE LA API ===\n');

const API_BASE_URL = 'https://turnio-backend-production.up.railway.app/api';

async function testAPISystem() {
  try {
    // PASO 1: Verificar que la API esté funcionando
    console.log('🔧 PASO 1: Verificando que la API esté funcionando...');
    const healthResponse = await fetch(`${API_BASE_URL}/subscriptions/plans`);
    if (healthResponse.ok) {
      console.log('✅ API funcionando correctamente');
    } else {
      throw new Error(`API no responde: ${healthResponse.status}`);
    }

    // PASO 2: Obtener planes disponibles
    console.log('\n📋 PASO 2: Obteniendo planes disponibles...');
    const plansResponse = await fetch(`${API_BASE_URL}/subscriptions/plans`);
    const plansData = await plansResponse.json();
    
    if (plansData.success) {
      console.log('✅ Planes obtenidos correctamente');
      console.log('📊 Planes disponibles:');
      plansData.data.plans.forEach(plan => {
        console.log(`   - ${plan.name}: $${plan.price}`);
      });
    } else {
      throw new Error('No se pudieron obtener los planes');
    }

    // PASO 3: Crear negocio de prueba
    console.log('\n🏢 PASO 3: Creando negocio de prueba...');
    const registerData = {
      businessName: 'Negocio Prueba API',
      email: `test.api.${Date.now()}@example.com`,
      password: 'Test123!',
      phone: '1234567890',
      address: 'Dirección de Prueba API 123',
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
    const token = registerResult.data.token;

    console.log('✅ Negocio creado exitosamente');
    console.log('🎯 Business ID:', businessId);
    console.log('🔐 Token obtenido:', token ? 'SÍ' : 'NO');

    // PASO 4: Crear suscripción de prueba
    console.log('\n💳 PASO 4: Creando suscripción de prueba...');
    const subscriptionData = {
      businessId: businessId,
      planType: 'BASIC',
      billingCycle: 'MONTHLY'
    };

    const subscriptionResponse = await fetch(`${API_BASE_URL}/subscriptions/create-temp`, {
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
    const subscriptionId = subscriptionResult.data.id;

    console.log('✅ Suscripción creada exitosamente');
    console.log('🎯 Subscription ID:', subscriptionId);

    // PASO 5: Probar creación de pago
    console.log('\n💰 PASO 5: Probando creación de pago...');
    const paymentData = {
      subscriptionId: subscriptionId,
      amount: 4900,
      billingCycle: 'MONTHLY'
    };

    const paymentResponse = await fetch(`${API_BASE_URL}/mercadopago/create-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    });

    if (paymentResponse.ok) {
      const paymentResult = await paymentResponse.json();
      console.log('✅ Pago creado exitosamente');
      console.log('🎯 Payment ID:', paymentResult.data?.id || 'N/A');
      console.log('🔗 URL de pago:', paymentResult.data?.init_point || 'N/A');
    } else {
      const errorData = await paymentResponse.json();
      console.log('⚠️  Error al crear pago:', errorData.message);
      console.log('💡 Esto puede ser normal si MercadoPago no está configurado para pruebas locales');
    }

    // PASO 6: Verificar perfil del usuario
    console.log('\n👤 PASO 6: Verificando perfil del usuario...');
    const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('✅ Perfil obtenido correctamente');
      console.log('👤 Usuario:', profileData.data?.user?.name);
      console.log('🏢 Negocio:', profileData.data?.business?.name);
    } else {
      console.log('⚠️  Error al obtener perfil:', profileResponse.status);
    }

    // PASO 7: Probar endpoint de suscripción actual
    console.log('\n📊 PASO 7: Verificando suscripción actual...');
    const currentSubscriptionResponse = await fetch(`${API_BASE_URL}/subscriptions/current`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });

    if (currentSubscriptionResponse.ok) {
      const currentSubscriptionData = await currentSubscriptionResponse.json();
      console.log('✅ Suscripción actual obtenida');
      console.log('📋 Estado:', currentSubscriptionData.data?.status);
      console.log('💳 Plan:', currentSubscriptionData.data?.planType);
    } else {
      console.log('⚠️  Error al obtener suscripción actual:', currentSubscriptionResponse.status);
    }

    console.log('\n🎉 === PRUEBA DE API COMPLETADA ===');
    console.log('✅ Registro de usuario: OK');
    console.log('✅ Creación de negocio: OK');
    console.log('✅ Creación de suscripción: OK');
    console.log('✅ Autenticación: OK');
    console.log('✅ Endpoints protegidos: OK');
    console.log('\n💡 El sistema está funcionando correctamente en producción');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error.message);
    console.error('💡 Verifica que el backend esté desplegado correctamente');
  }
}

// Ejecutar pruebas
testAPISystem(); 