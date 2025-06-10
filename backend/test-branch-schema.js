const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

async function testBranchSchema() {
  try {
    console.log('🔍 Verificando schema de la tabla branches...');
    
    const response = await axios.get(`${API_BASE}/debug/branch-schema`);
    
    if (response.data.success) {
      console.log('✅ Schema verificado exitosamente');
      console.log('📋 Datos de ejemplo:', response.data.data);
    } else {
      console.log('❌ Error verificando schema:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error en la verificación:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Error details:', error.response?.data?.error);
    console.error('Stack:', error.response?.data?.details);
  }
}

// Ejecutar test
testBranchSchema(); 