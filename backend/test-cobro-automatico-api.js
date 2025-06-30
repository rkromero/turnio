const axios = require('axios');

const RAILWAY_API = {
  backend: 'https://turnio-backend-production.up.railway.app',
  frontend: 'https://turnio-frontend-production.up.railway.app'
};

async function probarCobroAutomaticoViaAPI() {
  try {
    console.log('🚀 === PRUEBA DE COBRO AUTOMÁTICO VIA API ===\n');

    // 1. Primero hacer health check del backend
    console.log('1️⃣ Verificando conectividad con Railway...');
    
    try {
      const healthResponse = await axios.get(`${RAILWAY_API.backend}/health`);
      console.log('✅ Backend Railway funciona:', healthResponse.data);
    } catch (error) {
      console.error('❌ Error conectando con Railway:', error.message);
      return;
    }

    // 2. Obtener información de suscripciones (necesitarás JWT token)
    console.log('\n2️⃣ Para probar el cobro automático necesitas:');
    console.log('🔑 Un token JWT válido de un usuario registrado');
    console.log('📧 El email del negocio que creaste');
    
    console.log('\n💡 INSTRUCCIONES:');
    console.log('1. Ve a https://turnio-frontend-production.up.railway.app');
    console.log('2. Inicia sesión con tu cuenta');
    console.log('3. Abre las herramientas de desarrollador (F12)');
    console.log('4. Ve a la consola y ejecuta: localStorage.getItem("token")');
    console.log('5. Copia el token y ejecútalo así:');
    console.log('   node test-cobro-automatico-api.js TU_TOKEN_AQUI');

    const token = process.argv[2];
    if (!token) {
      console.log('\n⚠️ No se proporcionó token. Ejecuta:');
      console.log('node test-cobro-automatico-api.js TU_TOKEN_JWT');
      return;
    }

    // 3. Probar con el token proporcionado
    console.log('\n3️⃣ Probando con token...');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Obtener información del usuario
    const userResponse = await axios.get(`${RAILWAY_API.backend}/api/auth/profile`, { headers });
    console.log('✅ Usuario autenticado:', userResponse.data.user.email);

    // Obtener suscripción actual
    const subResponse = await axios.get(`${RAILWAY_API.backend}/api/subscription/current`, { headers });
    const subscription = subResponse.data.subscription;
    
    console.log('✅ Suscripción encontrada:', {
      id: subscription.id.substring(0, 8) + '...',
      negocio: subscription.business?.name || 'N/A',
      plan: subscription.planType,
      estado: subscription.status,
      fechaActualCobro: subscription.nextBillingDate,
      monto: `$${subscription.priceAmount}`,
      ciclo: subscription.billingCycle
    });

    if (subscription.planType === 'FREE') {
      console.log('⚠️ No se puede probar cobro automático en plan FREE');
      console.log('💡 Primero actualiza a un plan de pago en la aplicación');
      return;
    }

    // 4. Modificar fecha de cobro (llamada al endpoint de testing)
    console.log('\n4️⃣ Modificando fecha para simular vencimiento...');
    
    // Crear endpoint de testing en el backend para esto
    const testingPayload = {
      subscriptionId: subscription.id,
      action: 'simulate_expiry'
    };

    try {
      const modifyResponse = await axios.post(
        `${RAILWAY_API.backend}/api/subscription/testing/modify-date`, 
        testingPayload, 
        { headers }
      );
      console.log('✅ Fecha modificada:', modifyResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️ Endpoint de testing no existe aún');
        console.log('💡 Vamos a crear el endpoint necesario...');
        
        // 5. Manual: Ejecutar verificación de suscripciones vencidas
        console.log('\n5️⃣ Ejecutando verificación manual...');
        
        try {
          const checkResponse = await axios.post(
            `${RAILWAY_API.backend}/api/subscription/check-expired`,
            {},
            { headers }
          );
          console.log('✅ Verificación ejecutada:', checkResponse.data);
        } catch (checkError) {
          console.log('⚠️ Endpoint de verificación tampoco existe');
          console.log('💡 Necesitamos crear los endpoints de testing');
        }
      } else {
        console.error('❌ Error modificando fecha:', error.response?.data || error.message);
      }
    }

    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. ✅ La suscripción está funcionando correctamente');
    console.log('2. 🔧 Vamos a crear endpoints de testing para simular cobros');
    console.log('3. 📅 Esto permitirá modificar fechas y probar el sistema completo');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 TOKEN INVÁLIDO. Para obtener un token válido:');
      console.log('1. Ve a https://turnio-frontend-production.up.railway.app');
      console.log('2. Inicia sesión');
      console.log('3. Abre F12 → Consola');
      console.log('4. Ejecuta: localStorage.getItem("token")');
      console.log('5. Copia el resultado y úsalo en este script');
    }
  }
}

// Función adicional: Solo verificar estado
async function verificarEstado() {
  try {
    const healthResponse = await axios.get(`${RAILWAY_API.backend}/health`);
    console.log('🏥 Estado del backend:', healthResponse.data);
    
    console.log('\n📊 Información del sistema:');
    console.log('Backend URL:', RAILWAY_API.backend);
    console.log('Frontend URL:', RAILWAY_API.frontend);
    console.log('\n💡 Para probar cobro automático ejecuta:');
    console.log('node test-cobro-automatico-api.js TU_TOKEN_JWT');
    
  } catch (error) {
    console.error('❌ Railway no disponible:', error.message);
  }
}

// Ejecutar según argumentos
const args = process.argv.slice(2);
if (args[0] && args[0] !== 'status') {
  probarCobroAutomaticoViaAPI();
} else {
  verificarEstado();
} 