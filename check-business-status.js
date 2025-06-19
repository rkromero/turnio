const fetch = require('node-fetch');

async function checkBusinessStatus() {
  try {
    console.log('🔍 Verificando estado del negocio...');
    
    const businessId = 'cmc3gqpwh0000kb0idwsh60iv';
    
    // Probar el endpoint de test-db para verificar conexión
    console.log('📤 Probando conexión a BD...');
    const dbResponse = await fetch('https://turnio-backend-production.up.railway.app/api/subscriptions/test-db');
    const dbData = await dbResponse.json();
    console.log('📥 DB Status:', dbResponse.status);
    console.log('📥 DB Data:', dbData);
    
    // Probar el endpoint de debug-create que sabemos que funciona
    console.log('\n📤 Probando debug-create...');
    const debugData = {
      businessId: businessId,
      planType: 'BASIC',
      billingCycle: 'MONTHLY'
    };
    
    const debugResponse = await fetch('https://turnio-backend-production.up.railway.app/api/subscriptions/debug-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(debugData)
    });
    
    console.log('📥 Debug Status:', debugResponse.status);
    const debugResponseText = await debugResponse.text();
    console.log('📥 Debug Response:', debugResponseText);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBusinessStatus(); 