const fetch = require('node-fetch');

async function testCreateTempNew() {
  try {
    console.log('🧪 Probando endpoint /create-temp con nuevo negocio...');
    
    const testData = {
      businessId: 'cmc3hpscl0006oa0iruf53eh6', // Nuevo negocio de prueba
      planType: 'BASIC',
      billingCycle: 'MONTHLY'
    };
    
    console.log('📤 Enviando datos:', testData);
    
    const response = await fetch('https://turnio-backend-production.up.railway.app/api/subscriptions/create-temp', {
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
    } else {
      console.log('❌ Error response:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCreateTempNew(); 