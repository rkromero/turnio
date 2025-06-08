// Script completo para diagnosticar el sistema de scoring
const axios = require('axios');

async function debugScoringSystem() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA DE SCORING\n');
  
  try {
    // 1. Verificar si las tablas existen y tienen datos
    console.log('1️⃣ Verificando estructura de base de datos...');
    
    try {
      const dbCheck = await axios.get('https://turnio-backend-production.up.railway.app/debug/check-scoring-tables');
      console.log('✅ Respuesta de verificación de tablas:', dbCheck.data);
    } catch (error) {
      console.log('❌ Error verificando tablas:', error.response?.data || error.message);
    }
    
    // 2. Probar endpoint de scoring con diferentes emails
    console.log('\n2️⃣ Probando endpoint de scoring...');
    
    const testEmails = [
      'pepe@test.com',
      'ricardo@gmail.com',
      'juan.perez@email.com',
      'test@score.com'
    ];
    
    for (const email of testEmails) {
      try {
        console.log(`\n📧 Probando email: ${email}`);
        const response = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=${encodeURIComponent(email)}`);
        console.log('   Respuesta:', JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.log('   ❌ Error:', error.response?.status, error.response?.data || error.message);
      }
    }
    
    // 3. Verificar clientes existentes en la tabla principal
    console.log('\n3️⃣ Verificando clientes en tabla principal...');
    
    try {
      const clientsCheck = await axios.get('https://turnio-backend-production.up.railway.app/debug/list-clients');
      console.log('✅ Clientes en base de datos:', clientsCheck.data);
    } catch (error) {
      console.log('❌ Error obteniendo clientes:', error.response?.data || error.message);
    }
    
    // 4. Verificar citas existentes
    console.log('\n4️⃣ Verificando citas existentes...');
    
    try {
      const appointmentsCheck = await axios.get('https://turnio-backend-production.up.railway.app/debug/list-appointments');
      console.log('✅ Citas recientes:', appointmentsCheck.data);
    } catch (error) {
      console.log('❌ Error obteniendo citas:', error.response?.data || error.message);
    }
    
    // 5. Probar creación manual de scoring
    console.log('\n5️⃣ Probando creación manual de scoring...');
    
    try {
      const createScoring = await axios.post('https://turnio-backend-production.up.railway.app/debug/create-test-scoring', {
        email: 'test-scoring@debug.com',
        name: 'Test Scoring Usuario'
      });
      console.log('✅ Scoring de prueba creado:', createScoring.data);
    } catch (error) {
      console.log('❌ Error creando scoring de prueba:', error.response?.data || error.message);
    }
    
    // 6. Verificar logs del servidor
    console.log('\n6️⃣ Verificando logs del servidor...');
    
    try {
      const logs = await axios.get('https://turnio-backend-production.up.railway.app/debug/recent-logs');
      console.log('📋 Logs recientes:', logs.data);
    } catch (error) {
      console.log('❌ Error obteniendo logs:', error.response?.data || error.message);
    }
    
    console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO COMPLETADO');
    console.log('Ver resultados arriba para identificar los problemas específicos.');
    
  } catch (error) {
    console.error('❌ Error general en diagnóstico:', error.message);
  }
}

debugScoringSystem(); 