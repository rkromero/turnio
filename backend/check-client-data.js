// Script para verificar datos de cliente específico
const axios = require('axios');

async function checkClientData() {
  console.log('🔍 VERIFICANDO DATOS DEL CLIENTE\n');
  
  try {
    // Verificar si el email ya tiene datos en el sistema de scoring
    console.log('📧 Verificando email: scoring@asd.com');
    const scoreResponse = await axios.get('https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=scoring@asd.com');
    console.log('   Datos de scoring:', JSON.stringify(scoreResponse.data, null, 2));
    
    // Probar con diferentes variaciones
    console.log('\n🔍 Probando otros emails relacionados...');
    const testEmails = [
      'carlos@test.com',
      'carlos@asd.com', 
      'score@asd.com'
    ];
    
    for (const email of testEmails) {
      try {
        const response = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=${email}`);
        console.log(`   ${email}:`, response.data);
      } catch (error) {
        console.log(`   ${email}: Error -`, error.response?.status || error.message);
      }
    }
    
    console.log('\n📋 ANÁLISIS:');
    console.log('   • Si scoring@asd.com tiene datos previos, explicaría el problema');
    console.log('   • El sistema puede estar fusionando clientes por email');
    console.log('   • Cuando creates una cita con un email existente, usa el nombre previo');
    
    console.log('\n💡 SOLUCIÓN:');
    console.log('   1. Usa un email completamente nuevo: scoring-test-2@ejemplo.com');
    console.log('   2. O revisa en qué parte del código se guardan los nombres');
    console.log('   3. El problema está en la lógica de creación/actualización de clientes');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkClientData(); 