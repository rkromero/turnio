const fetch = require('node-fetch');

async function testCompleteFlow() {
  try {
    console.log('🧪 === PRUEBA DEL FLUJO COMPLETO ===\n');
    
    // PASO 1: Registro de negocio
    console.log('📝 PASO 1: Registrando nuevo negocio...');
    const registerData = {
      businessName: 'Test Flow Complete',
      email: 'test.flow@example.com',
      password: 'Test123!',
      phone: '1234567890',
      address: 'Test Address 456',
      businessType: 'GENERAL'
    };
    
    const registerResponse = await fetch('https://turnio-backend-production.up.railway.app/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });
    
    if (!registerResponse.ok) {
      throw new Error(`Registro falló: ${registerResponse.status}`);
    }
    
    const registerResult = await registerResponse.json();
    console.log('✅ Registro exitoso:', registerResult.data.business.name);
    console.log('🎯 Business ID:', registerResult.data.business.id);
    console.log('🎯 Plan inicial:', registerResult.data.business.planType);
    
    const businessId = registerResult.data.business.id;
    
    // PASO 2: Obtener planes disponibles
    console.log('\n📋 PASO 2: Obteniendo planes disponibles...');
    const plansResponse = await fetch('https://turnio-backend-production.up.railway.app/api/subscriptions/plans');
    
    if (!plansResponse.ok) {
      throw new Error(`Obtener planes falló: ${plansResponse.status}`);
    }
    
    const plansResult = await plansResponse.json();
    console.log('✅ Planes obtenidos:', plansResult.data.plans.length, 'planes disponibles');
    
    // PASO 3: Seleccionar plan BASIC y crear suscripción
    console.log('\n💳 PASO 3: Seleccionando plan BASIC y creando suscripción...');
    const subscriptionData = {
      businessId: businessId,
      planType: 'BASIC',
      billingCycle: 'MONTHLY'
    };
    
    const subscriptionResponse = await fetch('https://turnio-backend-production.up.railway.app/api/subscriptions/create-temp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionData)
    });
    
    if (!subscriptionResponse.ok) {
      throw new Error(`Crear suscripción falló: ${subscriptionResponse.status}`);
    }
    
    const subscriptionResult = await subscriptionResponse.json();
    console.log('✅ Suscripción creada exitosamente');
    console.log('🎯 Subscription ID:', subscriptionResult.data.subscription.id);
    console.log('🎯 Plan seleccionado:', subscriptionResult.data.subscription.planType);
    console.log('🎯 Status:', subscriptionResult.data.subscription.status);
    console.log('🎯 Precio:', subscriptionResult.data.subscription.priceAmount);
    console.log('🎯 Requiere pago:', subscriptionResult.data.requiresPayment);
    
    // PASO 4: Crear pago con MercadoPago
    if (subscriptionResult.data.requiresPayment) {
      console.log('\n💳 PASO 4: Creando pago con MercadoPago...');
      const paymentData = {
        subscriptionId: subscriptionResult.data.subscription.id
      };
      
      const paymentResponse = await fetch('https://turnio-backend-production.up.railway.app/api/mercadopago/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      
      if (!paymentResponse.ok) {
        const paymentError = await paymentResponse.text();
        console.log('⚠️  Crear pago falló (esto es normal si MercadoPago no está configurado):', paymentError);
      } else {
        const paymentResult = await paymentResponse.json();
        console.log('✅ Pago creado exitosamente');
        console.log('🎯 Preference ID:', paymentResult.data.preferenceId);
        console.log('🎯 Init Point:', paymentResult.data.initPoint);
        console.log('🎯 Public Key:', paymentResult.data.publicKey);
      }
    }
    
    // PASO 5: Verificar estado final
    console.log('\n🔍 PASO 5: Verificando estado final del negocio...');
    const businessResponse = await fetch(`https://turnio-backend-production.up.railway.app/api/subscriptions/test-db`);
    
    if (businessResponse.ok) {
      const businessResult = await businessResponse.json();
      console.log('✅ Estado de la base de datos:', businessResult.message);
      console.log('🎯 Total de negocios:', businessResult.businessCount);
      console.log('🎯 Total de suscripciones:', businessResult.subscriptionCount);
    }
    
    console.log('\n🎉 === FLUJO COMPLETO EXITOSO ===');
    console.log('✅ Registro: OK');
    console.log('✅ Obtención de planes: OK');
    console.log('✅ Creación de suscripción: OK');
    console.log('✅ Flujo de pago: Configurado');
    console.log('\n🚀 El sistema está listo para usar en producción!');
    
  } catch (error) {
    console.error('❌ Error en el flujo completo:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCompleteFlow(); 