const axios = require('axios');

// Configuración del API
const API_BASE = 'https://turnio-backend-production.up.railway.app';

// Función para hacer peticiones autenticadas
async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// 1. Probar login/auth
async function testAuth() {
  console.log('🔐 PROBANDO AUTENTICACIÓN...');
  
  // Intentar login con credenciales de prueba
  const loginResult = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@turnio.com', // Usar email existente
    password: 'admin123'       // Usar password existente
  });

  if (loginResult.success) {
    console.log('✅ Login exitoso');
    return loginResult.data.token;
  } else {
    console.log('❌ Login falló:', loginResult.error);
    return null;
  }
}

// 2. Probar endpoint de verificación de suscripciones
async function testSubscriptionCheck(token) {
  console.log('\n🔍 PROBANDO VERIFICACIÓN DE SUSCRIPCIONES...');
  
  const result = await makeRequest('POST', '/api/subscriptions/check-expired', null, token);
  
  if (result.success) {
    console.log('✅ Verificación exitosa');
    console.log('📊 Resultado:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Error en verificación:', result.error);
  }
  
  return result;
}

// 3. Probar obtener suscripciones
async function testGetSubscriptions(token) {
  console.log('\n📋 OBTENIENDO SUSCRIPCIONES...');
  
  const result = await makeRequest('GET', '/api/subscriptions', null, token);
  
  if (result.success) {
    console.log('✅ Suscripciones obtenidas');
    console.log(`📊 Total suscripciones: ${result.data.length || 0}`);
    
    if (result.data && result.data.length > 0) {
      result.data.slice(0, 3).forEach((sub, index) => {
        console.log(`\n🔖 Suscripción ${index + 1}:`);
        console.log(`   ID: ${sub.id}`);
        console.log(`   Plan: ${sub.plan}`);
        console.log(`   Estado: ${sub.status}`);
        console.log(`   Vence: ${sub.expiresAt}`);
        console.log(`   Activa: ${sub.isActive ? '✅' : '❌'}`);
      });
    }
  } else {
    console.log('❌ Error obteniendo suscripciones:', result.error);
  }
  
  return result;
}

// 4. Probar webhook de MercadoPago
async function testWebhook() {
  console.log('\n🔔 PROBANDO WEBHOOK DE MERCADOPAGO...');
  
  const webhookData = {
    action: 'payment.updated',
    api_version: 'v1',
    data: {
      id: 12345678901
    },
    date_created: new Date().toISOString(),
    id: Math.floor(Math.random() * 1000000),
    live_mode: false,
    type: 'payment',
    user_id: '1853396351'
  };

  const result = await makeRequest('POST', '/api/mercadopago/webhook', webhookData);
  
  if (result.success) {
    console.log('✅ Webhook procesado exitosamente');
    console.log('📊 Respuesta:', result.data);
  } else {
    console.log('❌ Error en webhook:', result.error);
  }
  
  return result;
}

// 5. Verificar estado del scheduler
async function testSchedulerStatus() {
  console.log('\n⏰ VERIFICANDO ESTADO DEL SCHEDULER...');
  
  const result = await makeRequest('GET', '/api/health');
  
  if (result.success) {
    console.log('✅ Sistema funcionando');
    console.log('📊 Estado:', result.data);
  } else {
    console.log('❌ Error verificando estado:', result.error);
  }
  
  return result;
}

// Función principal
async function main() {
  console.log('🚀 === PRUEBAS DEL SISTEMA DE COBROS AUTOMÁTICOS ===\n');
  console.log(`🌐 Probando contra: ${API_BASE}\n`);
  
  try {
    // 1. Autenticación
    const token = await testAuth();
    
    if (!token) {
      console.log('\n❌ No se pudo obtener token. Creando usuario de prueba...');
      
      // Intentar crear usuario de prueba
      const registerResult = await makeRequest('POST', '/api/auth/register', {
        name: 'Admin Pruebas',
        email: 'admin@pruebas.com',
        password: 'pruebas123',
        businessName: 'Negocio Pruebas',
        businessType: 'salon'
      });
      
      if (registerResult.success) {
        console.log('✅ Usuario de prueba creado');
        const loginResult = await makeRequest('POST', '/api/auth/login', {
          email: 'admin@pruebas.com',
          password: 'pruebas123'
        });
        
        if (loginResult.success) {
          token = loginResult.data.token;
          console.log('✅ Login con usuario de prueba exitoso');
        }
      }
    }
    
    if (token) {
      // 2. Verificar suscripciones
      await testGetSubscriptions(token);
      
      // 3. Verificar proceso de suscripciones vencidas
      await testSubscriptionCheck(token);
      
      // 4. Probar webhook
      await testWebhook();
    }
    
    // 5. Verificar estado general
    await testSchedulerStatus();
    
    console.log('\n🎉 === PRUEBAS COMPLETADAS ===');
    console.log('\n💡 Para verificar que el scheduler funciona en producción:');
    console.log('   - Ve a Railway → Backend Service → Logs');
    console.log('   - Busca mensajes cada 6 horas sobre verificación de suscripciones');
    
  } catch (error) {
    console.error('\n❌ Error en pruebas:', error.message);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, testAuth, testSubscriptionCheck, testGetSubscriptions, testWebhook, testSchedulerStatus }; 