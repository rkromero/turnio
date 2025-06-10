const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

async function testUpdateBranch() {
  try {
    console.log('🔧 Testing branch update with banner fields...');
    
    // Datos de prueba para actualizar la sucursal
    const updateData = {
      name: "Barberia Rodo - Principal",
      slug: "principal",
      address: "Aranguren 4261",
      phone: "+541134866718",
      description: "Sucursal principal (creada automáticamente)",
      banner: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=400&fit=crop",
      bannerAlt: "Interior moderno de barbería con sillas de cuero",
      isMain: true,
      latitude: -34.6037,
      longitude: -58.3816,
      timezone: "America/Argentina/Buenos_Aires"
    };
    
    console.log('📋 Update data:', JSON.stringify(updateData, null, 2));
    
    // Intentar actualizar la sucursal (necesitamos obtener el token primero)
    console.log('⚠️  Nota: Este test fallará porque no tenemos token de autenticación');
    console.log('⚠️  Pero podemos ver qué sucede con los datos');
    
    const response = await axios.put(
      `${API_BASE}/branches/cmbodsq1b0004st0i0lf62anz`, 
      updateData
    );
    
    console.log('✅ Branch updated successfully!');
    console.log('📋 Response:', response.data);
    
  } catch (error) {
    console.log('❌ Expected error (no auth):');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    console.log('Errors:', error.response?.data?.errors);
    
    // Si es error 401/403, es normal (no tenemos token)
    // Si es error 400, hay un problema con los datos
    if (error.response?.status === 400) {
      console.log('🚨 ERROR 400 - Problem with data validation!');
      console.log('🔍 Check the error details above');
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('✅ Error 401/403 is expected (no authentication token)');
    }
  }
}

// Ejecutar test
testUpdateBranch(); 