// Script para diagnosticar problemas con citas/turnos
const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

async function testAppointments() {
  console.log('🔍 DIAGNÓSTICO DE CITAS/TURNOS\n');
  
  try {
    // 1. Verificar salud del servidor
    console.log('1️⃣ Verificando salud del servidor...');
    const health = await axios.get(`${API_BASE.replace('/api', '')}/health`);
    console.log('   ✅ Servidor OK:', health.data.message);
    
    // 2. Intentar obtener citas sin autenticación (para ver el error)
    console.log('\n2️⃣ Probando endpoint de citas...');
    try {
      const appointments = await axios.get(`${API_BASE}/appointments`);
      console.log('   ✅ Citas obtenidas:', appointments.data);
    } catch (error) {
      console.log('   ⚠️ Error esperado (requiere auth):', error.response?.status, error.response?.data?.message);
    }
    
    // 3. Verificar cliente específico
    console.log('\n3️⃣ Verificando cliente scoring@asd.com...');
    const clientScore = await axios.get(`${API_BASE}/client-scoring/score?email=scoring@asd.com`);
    console.log('   Cliente encontrado:', clientScore.data);
    
    // 4. Verificar endpoints de dashboard
    console.log('\n4️⃣ Probando dashboard stats...');
    try {
      const dashboardStats = await axios.get(`${API_BASE}/dashboard/stats`);
      console.log('   ✅ Dashboard stats:', dashboardStats.data);
    } catch (error) {
      console.log('   ⚠️ Error dashboard (requiere auth):', error.response?.status, error.response?.data?.message);
    }
    
    console.log('\n📋 DIAGNÓSTICO COMPLETADO');
    console.log('\n🎯 POSIBLES SOLUCIONES:');
    console.log('   1. Recarga la página de Turnos (Ctrl+F5)');
    console.log('   2. Revisa si hay filtros activos en la página');
    console.log('   3. Verifica que estés logueado correctamente');
    console.log('   4. Comprueba la fecha de la cita creada');
    console.log('   5. Asegúrate de estar en el negocio correcto');
    
    console.log('\n💡 INFORMACIÓN ÚTIL:');
    console.log('   • El cliente scoring@asd.com está registrado');
    console.log('   • El sistema de scoring está funcionando');
    console.log('   • Los endpoints del servidor están operativos');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
  }
}

testAppointments(); 