const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

// Configuración de prueba
const TEST_CONFIG = {
  email: 'test@turnio.com', // <--- Cambia aquí tu email de prueba
  password: 'test123',      // <--- Cambia aquí tu contraseña de prueba
  token: null, // Se obtendrá al hacer login
  businessId: null, // Se obtendrá automáticamente
  subscriptionId: null // Se obtendrá automáticamente
};

// Función para crear usuario si no existe
async function ensureUserExists() {
  try {
    console.log('👤 Verificando existencia de usuario...');
    // Intentar login primero
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        email: TEST_CONFIG.email,
        password: TEST_CONFIG.password
      });
      console.log('✅ Usuario ya existe.');
      return;
    } catch (err) {
      // Si el error es 401 o similar, intentamos crearlo
      console.log('ℹ️ Usuario no existe, creando...');
      await axios.post(`${API_BASE}/auth/register`, {
        email: TEST_CONFIG.email,
        password: TEST_CONFIG.password,
        name: 'Test User',
        businessName: 'Negocio Test',
        phone: '1111111111'
      });
      console.log('✅ Usuario creado exitosamente.');
    }
  } catch (error) {
    console.error('❌ Error creando usuario:', error.response?.data || error.message);
    throw error;
  }
}

// Función para hacer login y obtener token
async function login() {
  try {
    console.log('🔐 Iniciando sesión...');
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_CONFIG.email,
      password: TEST_CONFIG.password
    });

    TEST_CONFIG.token = response.data.token;
    console.log('✅ Login exitoso');
    
    // Obtener businessId del usuario logueado
    if (response.data.user && response.data.user.businessId) {
      TEST_CONFIG.businessId = response.data.user.businessId;
      console.log('🏢 businessId detectado:', TEST_CONFIG.businessId);
    } else {
      // Si no viene en el login, buscarlo por endpoint de usuario actual
      const userResp = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${TEST_CONFIG.token}` }
      });
      TEST_CONFIG.businessId = userResp.data.businessId;
      console.log('🏢 businessId detectado (por /me):', TEST_CONFIG.businessId);
    }

    // Buscar subscriptionId automáticamente
    const subResp = await axios.get(`${API_BASE}/subscriptions/current`, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.token}` }
    });
    if (subResp.data && subResp.data.id) {
      TEST_CONFIG.subscriptionId = subResp.data.id;
      console.log('🔑 subscriptionId detectado:', TEST_CONFIG.subscriptionId);
    } else if (subResp.data && subResp.data.data && subResp.data.data.subscription && subResp.data.data.subscription.id) {
      TEST_CONFIG.subscriptionId = subResp.data.data.subscription.id;
      console.log('🔑 subscriptionId detectado:', TEST_CONFIG.subscriptionId);
    } else {
      throw new Error('No se pudo obtener subscriptionId automáticamente');
    }

    return response.data.token;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener información de suscripción
async function getSubscriptionInfo() {
  try {
    console.log('\n📊 Obteniendo información de suscripción...');
    
    const response = await axios.get(`${API_BASE}/subscriptions/${TEST_CONFIG.subscriptionId}`, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.token}` }
    });

    const subscription = response.data;
    console.log('📋 Estado actual:');
    console.log(`   Plan: ${subscription.planType}`);
    console.log(`   Estado: ${subscription.status}`);
    console.log(`   Próximo cobro: ${subscription.nextBillingDate}`);
    console.log(`   Metadata:`, JSON.stringify(subscription.metadata, null, 2));
    
    return subscription;
  } catch (error) {
    console.error('❌ Error obteniendo suscripción:', error.response?.data || error.message);
    throw error;
  }
}

// Función para cambiar plan
async function changePlan(newPlanType) {
  try {
    console.log(`\n🔄 Cambiando plan a: ${newPlanType}`);
    
    const response = await axios.post(`${API_BASE}/subscriptions/${TEST_CONFIG.subscriptionId}/change-plan`, {
      newPlanType: newPlanType
    }, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.token}` }
    });

    const result = response.data;
    console.log('✅ Resultado del cambio:');
    console.log(`   Mensaje: ${result.message}`);
    console.log(`   Requiere pago: ${result.requiresPayment}`);
    console.log(`   Tipo de cambio: ${result.changeType}`);
    
    if (result.requiresPayment) {
      console.log(`   ID de pago: ${result.paymentId}`);
      console.log(`   Monto: $${result.amount}`);
    }
    
    if (result.newPlanPrice) {
      console.log(`   Precio nuevo plan: $${result.newPlanPrice}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error cambiando plan:', error.response?.data || error.message);
    throw error;
  }
}

// Función para procesar pago de upgrade
async function processUpgradePayment(paymentId) {
  try {
    console.log(`\n💳 Procesando pago de upgrade: ${paymentId}`);
    
    const response = await axios.post(`${API_BASE}/subscriptions/process-upgrade-payment`, {
      paymentId: paymentId
    }, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.token}` }
    });

    const result = response.data;
    console.log('✅ Pago de upgrade procesado:');
    console.log(`   Mensaje: ${result.message}`);
    console.log(`   De: ${result.fromPlan} → ${result.toPlan}`);
    
    return result;
  } catch (error) {
    console.error('❌ Error procesando pago de upgrade:', error.response?.data || error.message);
    throw error;
  }
}

// Función para procesar pago de downgrade
async function processDowngradePayment(paymentId) {
  try {
    console.log(`\n💳 Procesando pago de downgrade: ${paymentId}`);
    
    const response = await axios.post(`${API_BASE}/subscriptions/process-downgrade-payment`, {
      paymentId: paymentId
    }, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.token}` }
    });

    const result = response.data;
    console.log('✅ Pago de downgrade procesado:');
    console.log(`   Mensaje: ${result.message}`);
    console.log(`   De: ${result.fromPlan} → ${result.toPlan}`);
    
    return result;
  } catch (error) {
    console.error('❌ Error procesando pago de downgrade:', error.response?.data || error.message);
    throw error;
  }
}

// Función para procesar downgrades pendientes
async function processPendingDowngrades() {
  try {
    console.log('\n🔍 Procesando downgrades pendientes...');
    
    const response = await axios.post(`${API_BASE}/subscriptions/process-pending-downgrades`, {}, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.token}` }
    });

    const result = response.data;
    console.log(`✅ Downgrades procesados: ${result.processedCount}`);
    
    return result;
  } catch (error) {
    console.error('❌ Error procesando downgrades:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener historial de cambios
async function getPlanChangeHistory() {
  try {
    console.log('\n📜 Obteniendo historial de cambios...');
    
    const response = await axios.get(`${API_BASE}/subscriptions/plan-change-history/${TEST_CONFIG.businessId}`, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.token}` }
    });

    const history = response.data;
    console.log('📋 Historial de cambios:');
    history.forEach((change, index) => {
      console.log(`   ${index + 1}. ${change.fromPlan} → ${change.toPlan} (${change.changeReason}) - ${change.createdAt}`);
    });
    
    return history;
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error.response?.data || error.message);
    throw error;
  }
}

// Función principal de prueba
async function runTests() {
  try {
    console.log('🚀 Iniciando pruebas del sistema de cambio de plan...\n');
    
    // 0. Crear usuario si no existe
    await ensureUserExists();
    
    // 1. Login
    await login();
    
    // 2. Estado inicial
    await getSubscriptionInfo();
    
    // 3. Prueba de UPGRADE (BASIC → PREMIUM)
    console.log('\n' + '='.repeat(50));
    console.log('📈 PRUEBA 1: UPGRADE (BASIC → PREMIUM)');
    console.log('='.repeat(50));
    
    const upgradeResult = await changePlan('PREMIUM');
    
    if (upgradeResult.requiresPayment) {
      // Simular pago aprobado
      await processUpgradePayment(upgradeResult.paymentId);
    }
    
    await getSubscriptionInfo();
    
    // 4. Prueba de DOWNGRADE (PREMIUM → BASIC)
    console.log('\n' + '='.repeat(50));
    console.log('📉 PRUEBA 2: DOWNGRADE (PREMIUM → BASIC)');
    console.log('='.repeat(50));
    
    const downgradeResult = await changePlan('BASIC');
    await getSubscriptionInfo();
    
    // 5. Procesar downgrades pendientes (simular vencimiento)
    console.log('\n' + '='.repeat(50));
    console.log('⏰ PRUEBA 3: PROCESAR DOWNGRADES PENDIENTES');
    console.log('='.repeat(50));
    
    await processPendingDowngrades();
    await getSubscriptionInfo();
    
    // 6. Historial de cambios
    console.log('\n' + '='.repeat(50));
    console.log('📜 PRUEBA 4: HISTORIAL DE CAMBIOS');
    console.log('='.repeat(50));
    
    await getPlanChangeHistory();
    
    console.log('\n✅ Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
  }
}

// Ejecutar pruebas
runTests(); 