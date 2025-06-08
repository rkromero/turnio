// Script para debuggear la lógica de actualización de nombres
const axios = require('axios');

async function debugUpdateLogic() {
  console.log('🔍 DEBUGGEANDO LÓGICA DE ACTUALIZACIÓN\n');
  
  // Crear un endpoint de debug en el servidor para ver qué está pasando
  const debugEndpoint = 'https://turnio-backend-production.up.railway.app/debug/client-update-process';
  
  try {
    console.log('1️⃣ Verificando cliente existente ricardo@gmail.com...');
    
    // Primero ver el estado actual
    const currentState = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=ricardo@gmail.com`);
    console.log('Estado actual:', currentState.data);
    
    // Simular exactamente lo que está pasando en el servidor
    console.log('\n2️⃣ Simulando lógica de comparación...');
    
    const clientName = 'ALFREDO-NUEVO';
    const existingName = 'ricardo'; // Lo que está en la BD
    
    console.log(`clientName: "${clientName}"`);
    console.log(`existingName: "${existingName}"`);
    console.log(`clientName.trim(): "${clientName.trim()}"`);
    console.log(`Comparación: "${clientName.trim()}" !== "${existingName}" = ${clientName.trim() !== existingName}`);
    
    if (clientName && clientName.trim() !== existingName) {
      console.log('✅ La condición DEBERÍA ser verdadera - debe actualizar');
    } else {
      console.log('❌ La condición es falsa - NO actualizará');
    }
    
    // Ahora probar con datos reales
    console.log('\n3️⃣ Probando actualización real...');
    
    const testData = {
      clientName: 'ALFREDO-ACTUALIZADO',
      clientEmail: 'ricardo@gmail.com',
      clientPhone: '+54 9 11 1234-5678',
      serviceId: 'cmbnphqvp0001qh0i2tn1anxw',
      startTime: '2025-06-17T14:00:00.000Z',
      notes: 'Test actualización',
      professionalId: null
    };
    
    console.log('Enviando:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(
      'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
      testData
    );
    
    console.log('\n📋 Respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    const returnedName = response.data.data?.clientName;
    console.log(`\n🎯 RESULTADO:`);
    console.log(`   Enviado: "ALFREDO-ACTUALIZADO"`);
    console.log(`   Devuelto: "${returnedName}"`);
    
    if (returnedName === 'ALFREDO-ACTUALIZADO') {
      console.log('✅ ¡FUNCIONA! El nombre se actualizó correctamente');
    } else {
      console.log('❌ NO FUNCIONA - El nombre NO se actualizó');
      console.log('   Esto confirma que hay un bug en la lógica de actualización');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugUpdateLogic(); 