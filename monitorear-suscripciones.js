const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app';

// Función para obtener token (usando credenciales que sabemos que existen)
async function getToken() {
  try {
    // Primero intentamos con credenciales existentes
    const emails = [
      'admin@salonpruebas.com',
      'admin@turnio.com', 
      'test@test.com'
    ];
    
    for (const email of emails) {
      try {
        const response = await axios.post(`${API_BASE}/api/auth/login`, {
          email: email,
          password: 'pruebas123'
        });
        
        if (response.data && response.data.token) {
          console.log(`✅ Login exitoso con: ${email}`);
          return response.data.token;
        }
      } catch (error) {
        // Intentar siguiente email
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.log('❌ Error obteniendo token:', error.message);
    return null;
  }
}

// Función para obtener suscripciones
async function obtenerSuscripciones(token) {
  try {
    const response = await axios.get(`${API_BASE}/api/subscriptions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.data;
  } catch (error) {
    console.log('❌ Error obteniendo suscripciones:', error.response?.data || error.message);
    return [];
  }
}

// Función para verificar scheduler manualmente
async function verificarScheduler(token) {
  try {
    const response = await axios.post(`${API_BASE}/api/subscriptions/check-expired`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Scheduler ejecutado manualmente');
    console.log('📊 Resultado:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Error ejecutando scheduler:', error.response?.data || error.message);
    return null;
  }
}

// Función principal de monitoreo
async function monitorear() {
  console.log('🔍 === MONITOREO DE SUSCRIPCIONES EN TIEMPO REAL ===\n');
  
  const token = await getToken();
  
  if (!token) {
    console.log('❌ No se pudo obtener token. Asegúrate de que el negocio esté registrado.');
    console.log('💡 Ve a: https://turnio-frontend-production.up.railway.app');
    console.log('📝 Registra un negocio con: admin@salonpruebas.com / pruebas123');
    return;
  }
  
  // Monitoreo cada 30 segundos
  let contador = 1;
  
  const interval = setInterval(async () => {
    console.log(`\n🔄 === VERIFICACIÓN #${contador} - ${new Date().toLocaleTimeString()} ===`);
    
    // 1. Obtener suscripciones
    const suscripciones = await obtenerSuscripciones(token);
    console.log(`📊 Suscripciones encontradas: ${suscripciones.length}`);
    
    if (suscripciones.length > 0) {
      suscripciones.forEach((sub, index) => {
        console.log(`\n🔖 Suscripción ${index + 1}:`);
        console.log(`   ID: ${sub.id}`);
        console.log(`   Plan: ${sub.plan}`);
        console.log(`   Estado: ${sub.status}`);
        console.log(`   Activa: ${sub.isActive ? '✅' : '❌'}`);
        console.log(`   Vence: ${sub.expiresAt}`);
        
        // Verificar si está próxima a vencer
        const expiry = new Date(sub.expiresAt);
        const now = new Date();
        const horasRestantes = (expiry - now) / (1000 * 60 * 60);
        
        if (horasRestantes < 24) {
          console.log(`   ⚠️  PRÓXIMA A VENCER: ${Math.round(horasRestantes)} horas`);
        }
      });
      
      // 2. Verificar scheduler manualmente si hay suscripciones
      if (contador % 3 === 0) { // Cada 3ra verificación
        console.log('\n⚡ Ejecutando verificación manual del scheduler...');
        await verificarScheduler(token);
      }
    }
    
    contador++;
    
    // Detener después de 20 verificaciones (10 minutos)
    if (contador > 20) {
      clearInterval(interval);
      console.log('\n🏁 === MONITOREO COMPLETADO ===');
      console.log('💡 El sistema seguirá funcionando automáticamente cada 6 horas');
    }
  }, 30000); // Cada 30 segundos
  
  console.log('🎯 Monitoreando cada 30 segundos...');
  console.log('⏹️  Presiona Ctrl+C para detener\n');
}

// Ejecutar
monitorear().catch(console.error); 