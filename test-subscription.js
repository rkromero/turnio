const fetch = require('node-fetch');

async function testCreateSubscription() {
  try {
    console.log('🧪 Probando createSubscription...');
    
    const testData = {
      businessId: 'cmbtkv97d0000r20itmexj47n', // ID del último negocio creado
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

testCreateSubscription(); 