// Script para probar el endpoint de reservas públicas
const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

async function testPublicBooking() {
  console.log('🧪 PRUEBA DEL ENDPOINT DE RESERVAS PÚBLICAS\n');
  
  try {
    // 1. Verificar salud del servidor
    console.log('1️⃣ Verificando salud del servidor...');
    const health = await axios.get(`${API_BASE.replace('/api', '')}/health`);
    console.log('   ✅ Servidor OK:', health.data.message);
    
    // 2. Verificar información del negocio CDFA
    console.log('\n2️⃣ Verificando negocio CDFA...');
    const debugCdfa = await axios.get(`${API_BASE.replace('/api', '')}/debug/cdfa`);
    console.log('   Info del negocio:', JSON.stringify(debugCdfa.data, null, 2));
    
    if (!debugCdfa.data.debug.businessFound) {
      console.log('❌ ERROR: Negocio CDFA no encontrado!');
      return;
    }
    
    const business = debugCdfa.data.debug.business;
    
    // 3. Preparar datos de prueba para reserva
    console.log('\n3️⃣ Preparando datos de reserva...');
    const testBooking = {
      clientName: 'Cliente Prueba API',
      clientEmail: 'test-api@ejemplo.com',
      clientPhone: '+5491122334455',
      serviceId: business.services[0]?.id, // Primer servicio disponible
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
      notes: 'Reserva de prueba desde script',
      professionalId: null // Asignación automática
    };
    
    console.log('   Datos de prueba:', JSON.stringify(testBooking, null, 2));
    
    if (!testBooking.serviceId) {
      console.log('❌ ERROR: No hay servicios disponibles en el negocio!');
      return;
    }
    
    // 4. Intentar crear la reserva
    console.log('\n4️⃣ Creando reserva pública...');
    try {
      const bookingResponse = await axios.post(`${API_BASE}/public/cdfa/book`, testBooking, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   ✅ RESERVA CREADA EXITOSAMENTE!');
      console.log('   Respuesta:', JSON.stringify(bookingResponse.data, null, 2));
      
    } catch (bookingError) {
      console.log('   ❌ ERROR EN RESERVA:');
      console.log('   Status:', bookingError.response?.status);
      console.log('   Error:', bookingError.response?.data);
      console.log('   Message:', bookingError.message);
      
      // Verificar detalles del error
      if (bookingError.response?.status === 400) {
        console.log('\n   📋 POSIBLES CAUSAS (Error 400):');
        console.log('   • Servicio no válido');
        console.log('   • Horario no disponible');
        console.log('   • Datos de entrada incorrectos');
        console.log('   • Profesional no disponible');
      } else if (bookingError.response?.status === 404) {
        console.log('\n   📋 POSIBLES CAUSAS (Error 404):');
        console.log('   • Negocio no encontrado');
        console.log('   • Ruta incorrecta');
      } else if (bookingError.response?.status === 500) {
        console.log('\n   📋 POSIBLES CAUSAS (Error 500):');
        console.log('   • Error interno del servidor');
        console.log('   • Problema con la base de datos');
        console.log('   • Error en la lógica del backend');
      }
    }
    
    // 5. Verificar si el cliente se creó
    console.log('\n5️⃣ Verificando si el cliente se registró...');
    const clientCheck = await axios.get(`${API_BASE}/client-scoring/score?email=test-api@ejemplo.com`);
    console.log('   Cliente en sistema:', clientCheck.data);
    
    console.log('\n📋 DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error general en la prueba:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

testPublicBooking(); 