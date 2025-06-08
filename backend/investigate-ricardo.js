// Investigación específica del caso ricardo@gmail.com
const axios = require('axios');

async function investigateRicardo() {
  console.log('🔍 INVESTIGANDO EL CASO RICARDO\n');
  
  try {
    // 1. Verificar si el cliente ricardo existe en el sistema de scoring
    console.log('1️⃣ Verificando sistema de scoring...');
    const scoringCheck = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=ricardo@gmail.com`);
    console.log('   Scoring:', scoringCheck.data);
    
    // 2. Intentar replicar EXACTAMENTE lo que hizo el usuario
    console.log('\n2️⃣ Replicando reserva de Ricardo...');
    
    const ricardoBooking = {
      clientName: 'ricardo',
      clientEmail: 'ricardo@gmail.com',
      clientPhone: '+5491123456789', // Número de ejemplo
      serviceId: 'cmbnphqvp0001qh0i2tn1anxw', // Manicura semipermanente 
      startTime: '2025-06-10T14:00:00.000Z', // Horario que sabemos que funciona
      notes: 'Test Ricardo',
      professionalId: null
    };
    
    console.log('   Datos de Ricardo:', JSON.stringify(ricardoBooking, null, 2));
    
    try {
      const response = await axios.post(
        'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
        ricardoBooking
      );
      
      console.log('\n   ✅ RESERVA RICARDO CREADA:');
      console.log('   Respuesta completa:', JSON.stringify(response.data, null, 2));
      
      // Verificar inmediatamente si el cliente se creó
      console.log('\n3️⃣ Verificando creación inmediata del cliente...');
      const immediateCheck = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=ricardo@gmail.com`);
      console.log('   Cliente en sistema:', immediateCheck.data);
      
      // Esperar un momento y volver a verificar
      console.log('\n4️⃣ Esperando 3 segundos y verificando nuevamente...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const delayedCheck = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=ricardo@gmail.com`);
      console.log('   Cliente después de 3s:', delayedCheck.data);
      
    } catch (error) {
      console.log('\n   ❌ ERROR EN RESERVA RICARDO:');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data);
      console.log('   Mensaje:', error.message);
    }
    
    // 5. Verificar otros emails que hayamos usado en pruebas
    console.log('\n5️⃣ Verificando otros clientes de prueba...');
    
    const testEmails = [
      'test-simple@ejemplo.com', // Del test que funcionó
      'test-api@ejemplo.com',    // Del test de API
      'test@score.com'           // Del caso del usuario
    ];
    
    for (const email of testEmails) {
      try {
        const check = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=${email}`);
        console.log(`   ${email}:`, check.data);
      } catch (error) {
        console.log(`   ${email}: ERROR -`, error.response?.status);
      }
    }
    
    console.log('\n📋 ANÁLISIS:');
    console.log('Si Ricardo aparece en la confirmación pero NO en la base de datos:');
    console.log('• ❌ La cita se crea pero el cliente NO');
    console.log('• ❌ Hay un fallo en la lógica de creación de clientes');
    console.log('• ❌ Posible error en la transacción de base de datos');
    console.log('• ❌ El endpoint público tiene un bug crítico');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

investigateRicardo(); 