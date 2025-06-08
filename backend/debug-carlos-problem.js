// Script para investigar el problema de "carlos"
const axios = require('axios');

async function debugCarlosProblem() {
  console.log('🔍 INVESTIGANDO EL PROBLEMA DE CARLOS\n');
  
  try {
    // 1. Verificar qué clientes existen con emails comunes
    console.log('1️⃣ Verificando clientes existentes...');
    
    const commonEmails = [
      'ricardo@gmail.com',
      'test@score.com', 
      'carlos@email.com',
      'carlos@gmail.com',
      'scoring@asd.com'
    ];
    
    for (const email of commonEmails) {
      try {
        const client = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=${email}`);
        if (client.data && client.data.data) {
          console.log(`   📧 ${email}: `, client.data);
        }
      } catch (error) {
        console.log(`   📧 ${email}: No existe`);
      }
    }
    
    // 2. Hacer una prueba con datos únicos
    console.log('\n2️⃣ Probando con datos completamente únicos...');
    
    const uniqueEmail = `test-${Date.now()}@unique.com`;
    const uniqueName = `Cliente-${Date.now()}`;
    
    const testBooking = {
      clientName: uniqueName,
      clientEmail: uniqueEmail,
      clientPhone: `+54911${Math.floor(Math.random() * 10000000)}`,
      serviceId: 'cmbnphqvp0001qh0i2tn1anxw',
      startTime: '2025-06-15T14:00:00.000Z',
      notes: 'Test datos únicos',
      professionalId: null
    };
    
    console.log('📝 Datos únicos enviados:');
    console.log(JSON.stringify(testBooking, null, 2));
    
    try {
      const response = await axios.post(
        'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
        testBooking
      );
      
      console.log('\n✅ Respuesta del servidor:');
      console.log(JSON.stringify(response.data, null, 2));
      
      const returnedName = response.data.data?.clientName;
      console.log(`\n🎭 NOMBRE ENVIADO: "${uniqueName}"`);
      console.log(`🎭 NOMBRE DEVUELTO: "${returnedName}"`);
      
      if (returnedName === uniqueName) {
        console.log('✅ ¡CORRECTO! Los nombres coinciden');
      } else {
        console.log('❌ ¡PROBLEMA! Los nombres NO coinciden');
        console.log('   Esto confirma que hay un problema en el backend');
      }
      
    } catch (error) {
      console.log('❌ Error en reserva única:', error.response?.data);
    }
    
    // 3. Probar específicamente con ricardo@gmail.com
    console.log('\n3️⃣ Probando específicamente con ricardo@gmail.com...');
    
    const ricardoTest = {
      clientName: 'ALFREDO-NUEVO',
      clientEmail: 'ricardo@gmail.com',
      clientPhone: '+54 9 11 1234-5678',
      serviceId: 'cmbnphqvp0001qh0i2tn1anxw',
      startTime: '2025-06-16T14:00:00.000Z',
      notes: 'Debe actualizar el nombre a ALFREDO-NUEVO',
      professionalId: null
    };
    
    console.log('📝 Datos Ricardo test:');
    console.log(JSON.stringify(ricardoTest, null, 2));
    
    try {
      const ricardoResponse = await axios.post(
        'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
        ricardoTest
      );
      
      console.log('\n✅ Respuesta Ricardo:');
      console.log(JSON.stringify(ricardoResponse.data, null, 2));
      
      const ricardoName = ricardoResponse.data.data?.clientName;
      console.log(`\n🎭 NOMBRE ENVIADO: "ALFREDO-NUEVO"`);
      console.log(`🎭 NOMBRE DEVUELTO: "${ricardoName}"`);
      
    } catch (error) {
      console.log('❌ Error en test Ricardo:', error.response?.data);
    }
    
    // 4. Verificar si hay un patrón en la base de datos
    console.log('\n4️⃣ Verificando estado final del cliente...');
    try {
      const finalCheck = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=ricardo@gmail.com`);
      console.log('Estado final del cliente:', finalCheck.data);
    } catch (error) {
      console.log('Error verificando estado final:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar investigación
debugCarlosProblem(); 