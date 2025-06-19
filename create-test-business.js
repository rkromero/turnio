const fetch = require('node-fetch');

async function createTestBusiness() {
  try {
    console.log('🧪 Creando negocio de prueba...');
    
    const testData = {
      businessName: 'Test Business Debug',
      email: 'test.debug@example.com',
      password: 'Test123!',
      phone: '1234567890',
      address: 'Test Address 123',
      businessType: 'GENERAL'
    };
    
    console.log('📤 Enviando datos de registro:', testData);
    
    const response = await fetch('https://turnio-backend-production.up.railway.app/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📥 Status:', response.status);
    console.log('📥 Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Response text:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Success:', data);
      
      // Extraer el businessId para usarlo en las pruebas
      if (data.success && data.data && data.data.business) {
        console.log('🎯 Business ID para pruebas:', data.data.business.id);
        return data.data.business.id;
      }
    } else {
      console.log('❌ Error response:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestBusiness(); 