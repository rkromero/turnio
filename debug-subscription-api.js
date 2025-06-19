const fetch = require('node-fetch');

console.log('🔍 === DEBUGGING SUSCRIPCIÓN VÍA API ===\n');

const API_BASE_URL = 'https://turnio-backend-production.up.railway.app/api';

async function debugSubscriptionAPI() {
  try {
    // PASO 1: Crear un negocio de prueba
    console.log('🏢 PASO 1: Creando negocio de prueba...');
    const registerData = {
      businessName: 'Debug Negocio',
      email: `debug.${Date.now()}@example.com`,
      password: 'Test123!',
      phone: '1234567890',
      address: 'Dirección Debug 123',
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

    // PASO 2: Crear suscripción
    console.log('\n💳 PASO 2: Creando suscripción...');
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
      console.log('📋 Estado de la suscripción:', currentSubscriptionData.data);
    } else {
      console.log('⚠️  Error al obtener suscripción actual:', currentSubscriptionResponse.status);
    }

    // PASO 4: Verificar perfil del usuario
    console.log('\n👤 PASO 4: Verificando perfil del usuario...');
    const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Cookie': `token=${token}`
      }
    });

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('👤 Perfil del usuario:', {
        name: profileData.data?.user?.name,
        businessName: profileData.data?.business?.name,
        planType: profileData.data?.business?.planType
      });
    } else {
      console.log('⚠️  Error al obtener perfil:', profileResponse.status);
    }

    console.log('\n🎉 === DEBUG COMPLETADO ===');

  } catch (error) {
    console.error('\n❌ Error durante el debug:', error.message);
  }
}

// Ejecutar debug
debugSubscriptionAPI(); 