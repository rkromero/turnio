const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

async function testBranches() {
  try {
    console.log('🔧 Getting business data...');
    
    // Obtener datos del negocio
    const dataResponse = await axios.get(`${API_BASE}/debug/business-data/barberia-rodo`);
    const data = dataResponse.data.data;
    
    console.log('✅ Business:', data.business.name);
    console.log('✅ Business ID:', data.business.id);
    
    // Crear endpoint temporal para verificar sucursales
    console.log('\n🏢 Checking branches...');
    
    try {
      const branchResponse = await axios.get(`${API_BASE}/debug/branches/${data.business.id}`);
      console.log('✅ Branches found:', branchResponse.data);
    } catch (branchError) {
      console.log('❌ Branch endpoint not found, creating manual check...');
      
      // Hacer una consulta directa usando el endpoint de debug
      const testResponse = await axios.post(`${API_BASE}/debug/check-branches`, {
        businessId: data.business.id
      });
      console.log('Branch check result:', testResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Error:', error.message);
  }
}

// Ejecutar test
testBranches(); 