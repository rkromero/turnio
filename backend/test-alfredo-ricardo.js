// Script para probar exactamente el caso de Alfredo con email ricardo@gmail.com
const axios = require('axios');

async function testAlfredoRicardo() {
  console.log('🎯 TEST ESPECÍFICO: Alfredo con ricardo@gmail.com\n');
  
  try {
    // 1. Limpiar cualquier cliente existente primero
    console.log('1️⃣ Verificando si existe cliente con email ricardo@gmail.com...');
    try {
      const existingClient = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=ricardo@gmail.com`);
      console.log('   Cliente existente:', existingClient.data);
    } catch (error) {
      console.log('   No hay cliente existente con ese email');
    }
    
    // 2. Crear reserva exactamente como tu la haces
    console.log('\n2️⃣ Creando reserva con nombre Alfredo y email ricardo@gmail.com...');
    const alfredoBooking = {
      clientName: 'alfredo',
      clientEmail: 'ricardo@gmail.com',
      clientPhone: '+54 9 11 1234-5678',
      serviceId: 'cmbnphqvp0001qh0i2tn1anxw', // Manicura semipermanente
      startTime: '2025-06-15T14:00:00.000Z', // Domingo a las 2 PM (horario que funciona)
      notes: 'Prueba desde script - debe mostrar Alfredo',
      professionalId: null
    };
    
    console.log('📝 Datos enviados:');
    console.log(JSON.stringify(alfredoBooking, null, 2));
    
    try {
      const response = await axios.post(
        'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
        alfredoBooking
      );
      
      console.log('\n✅ ¡RESERVA CREADA!');
      console.log('📋 Respuesta del servidor:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Verificar el nombre que devuelve
      const clientName = response.data.data?.clientName;
      console.log(`\n🎭 NOMBRE DEVUELTO: "${clientName}"`);
      
      if (clientName === 'alfredo') {
        console.log('✅ ¡CORRECTO! El nombre es "alfredo"');
      } else {
        console.log(`❌ PROBLEMA: Esperaba "alfredo" pero obtuve "${clientName}"`);
      }
      
      // 3. Verificar en el sistema de scoring
      console.log('\n3️⃣ Verificando en sistema de scoring...');
      const scoringCheck = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=ricardo@gmail.com`);
      console.log('Cliente en scoring:', scoringCheck.data);
      
    } catch (bookingError) {
      console.log('\n❌ ERROR CREANDO RESERVA:');
      console.log('Status:', bookingError.response?.status);
      console.log('Error:', bookingError.response?.data);
      
      if (bookingError.response?.status === 400) {
        console.log('\n💡 POSIBLE CAUSA: Horario no disponible');
        console.log('   Probemos con otro horario...');
        
        // Intentar con horario de tarde
        alfredoBooking.startTime = '2025-06-16T15:00:00.000Z'; // Lunes 3 PM
        
        try {
          const retryResponse = await axios.post(
            'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
            alfredoBooking
          );
          
          console.log('\n✅ ¡RESERVA CREADA EN SEGUNDO INTENTO!');
          console.log('📋 Respuesta:', JSON.stringify(retryResponse.data, null, 2));
          
          const clientName = retryResponse.data.data?.clientName;
          console.log(`\n🎭 NOMBRE DEVUELTO: "${clientName}"`);
          
        } catch (retryError) {
          console.log('\n❌ ERROR EN SEGUNDO INTENTO:', retryError.response?.data);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar el test
testAlfredoRicardo(); 