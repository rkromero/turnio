// Script para probar el nuevo endpoint público de scoring
const axios = require('axios');

async function testPublicScoring() {
  console.log('🧪 PROBANDO ENDPOINT PÚBLICO DE SCORING\n');
  
  const baseUrl = 'https://turnio-backend-production.up.railway.app';
  
  try {
    // 1. Registrar evento de asistencia
    console.log('1️⃣ Registrando evento ATTENDED...');
    
    const attendedEvent = {
      email: 'carlos.lopez@email.com',
      phone: null,
      clientName: 'carlos',
      appointmentId: 'test-appointment-' + Date.now(),
      eventType: 'ATTENDED',
      notes: 'Cliente puntual y satisfecho'
    };
    
    const response1 = await axios.post(`${baseUrl}/api/client-scoring/event/auto`, attendedEvent);
    console.log('   ✅ Respuesta:', JSON.stringify(response1.data, null, 2));
    
    // 2. Obtener scoring actualizado
    console.log('\n2️⃣ Verificando scoring actualizado...');
    
    const scoreResponse = await axios.get(`${baseUrl}/api/client-scoring/score?email=carlos.lopez@email.com`);
    console.log('   📊 Scoring actual:', JSON.stringify(scoreResponse.data, null, 2));
    
    // 3. Registrar evento NO_SHOW para otro cliente
    console.log('\n3️⃣ Registrando evento NO_SHOW...');
    
    const noShowEvent = {
      email: 'ricardo@gmail.com',
      phone: null,
      clientName: 'ricardo',
      appointmentId: 'test-appointment-noshow-' + Date.now(),
      eventType: 'NO_SHOW',
      notes: 'Cliente no se presentó sin avisar'
    };
    
    const response2 = await axios.post(`${baseUrl}/api/client-scoring/event/auto`, noShowEvent);
    console.log('   ✅ Respuesta:', JSON.stringify(response2.data, null, 2));
    
    // 4. Verificar scoring del segundo cliente
    console.log('\n4️⃣ Verificando scoring del segundo cliente...');
    
    const scoreResponse2 = await axios.get(`${baseUrl}/api/client-scoring/score?email=ricardo@gmail.com`);
    console.log('   📊 Scoring actual:', JSON.stringify(scoreResponse2.data, null, 2));
    
    console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('🔥 El endpoint público de scoring está funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.response?.data || error.message);
  }
}

testPublicScoring(); 