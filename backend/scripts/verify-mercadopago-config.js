/**
 * Script para verificar la configuración de MercadoPago
 * Ejecutar en Railway: node scripts/verify-mercadopago-config.js
 */

const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');

async function verifyMercadoPagoConfig() {
  console.log('\n🔍 === VERIFICACIÓN DE CONFIGURACIÓN DE MERCADOPAGO ===\n');

  // 1. Verificar variables de entorno
  console.log('📋 Verificando variables de entorno...\n');
  
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;
  const backendUrl = process.env.BACKEND_URL;
  const frontendUrl = process.env.FRONTEND_URL;

  const checks = {
    accessToken: !!accessToken,
    publicKey: !!publicKey,
    backendUrl: !!backendUrl,
    frontendUrl: !!frontendUrl
  };

  console.log(`✅ MERCADOPAGO_ACCESS_TOKEN: ${checks.accessToken ? 'Configurado' : '❌ FALTA'}`);
  if (accessToken) {
    console.log(`   Tipo: ${accessToken.startsWith('TEST-') ? 'Sandbox (pruebas)' : 'Producción'}`);
    console.log(`   Primeros caracteres: ${accessToken.substring(0, 20)}...`);
  }
  
  console.log(`✅ MERCADOPAGO_PUBLIC_KEY: ${checks.publicKey ? 'Configurado' : '❌ FALTA'}`);
  if (publicKey) {
    console.log(`   Tipo: ${publicKey.startsWith('TEST-') ? 'Sandbox (pruebas)' : 'Producción'}`);
    console.log(`   Primeros caracteres: ${publicKey.substring(0, 20)}...`);
  }
  
  console.log(`✅ BACKEND_URL: ${checks.backendUrl ? backendUrl : '❌ FALTA'}`);
  console.log(`✅ FRONTEND_URL: ${checks.frontendUrl ? frontendUrl : '❌ FALTA'}`);

  // 2. Verificar conexión con API de MercadoPago
  if (!accessToken) {
    console.log('\n❌ No se puede continuar sin MERCADOPAGO_ACCESS_TOKEN');
    console.log('\n📝 Para configurarlo en Railway:');
    console.log('   1. Ve a tu proyecto en Railway');
    console.log('   2. Selecciona el servicio backend');
    console.log('   3. Ve a Variables');
    console.log('   4. Agrega: MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx');
    console.log('   5. Agrega: MERCADOPAGO_PUBLIC_KEY=TEST-xxxx');
    console.log('\n📌 Obtén tus credenciales en:');
    console.log('   https://www.mercadopago.com.ar/developers/panel/app\n');
    process.exit(1);
  }

  console.log('\n🔌 Probando conexión con API de MercadoPago...\n');

  try {
    const client = new MercadoPagoConfig({ 
      accessToken: accessToken,
      options: { timeout: 5000 }
    });

    // Intentar crear una preferencia de prueba
    const preference = new Preference(client);
    
    const testPreference = {
      items: [{
        title: 'Test de Conexión',
        quantity: 1,
        unit_price: 100
      }],
      external_reference: 'test_' + Date.now()
    };

    const response = await preference.create({ body: testPreference });
    
    console.log('✅ Conexión exitosa con MercadoPago API');
    console.log(`✅ Preference ID creado: ${response.id}`);
    console.log(`✅ Init Point: ${response.init_point}`);
    
    // Verificar URLs de webhook
    console.log('\n📡 URLs de Webhook configuradas:');
    console.log(`   Pagos: ${backendUrl}/api/mercadopago/webhook`);
    console.log(`   Suscripciones: ${backendUrl}/api/mercadopago/subscription-webhook`);
    
    console.log('\n⚠️  Asegúrate de configurar estos webhooks en:');
    console.log('   https://www.mercadopago.com.ar/developers/panel/webhooks');

  } catch (error) {
    console.error('❌ Error conectando con MercadoPago API:');
    console.error(`   Mensaje: ${error.message}`);
    
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    
    if (error.cause) {
      console.error(`   Causa: ${JSON.stringify(error.cause, null, 2)}`);
    }

    console.log('\n🔧 Posibles soluciones:');
    console.log('   1. Verifica que el token sea válido');
    console.log('   2. Verifica que no haya espacios al inicio o final');
    console.log('   3. Verifica que sea el token correcto (TEST para pruebas)');
    console.log('   4. Regenera el token en el panel de MercadoPago\n');
    
    process.exit(1);
  }

  // 3. Verificar base de datos
  console.log('\n💾 Verificando conexión con base de datos...\n');
  
  try {
    const { prisma } = require('../src/config/database');
    
    const subscriptionCount = await prisma.subscription.count();
    const paymentCount = await prisma.payment.count();
    
    console.log(`✅ Base de datos conectada`);
    console.log(`   Suscripciones: ${subscriptionCount}`);
    console.log(`   Pagos: ${paymentCount}`);

    // Verificar suscripciones próximas a vencer
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcomingExpirations = await prisma.subscription.count({
      where: {
        nextBillingDate: {
          gte: now,
          lte: in7Days
        },
        status: 'ACTIVE',
        planType: { not: 'FREE' }
      }
    });

    console.log(`   Suscripciones por vencer (próximos 7 días): ${upcomingExpirations}`);

    if (upcomingExpirations > 0) {
      console.log('\n⚠️  Hay suscripciones próximas a vencer!');
      console.log('   Considera implementar recordatorios automáticos');
    }

  } catch (error) {
    console.error('❌ Error conectando con base de datos:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }

  // 4. Resumen final
  console.log('\n✅ === VERIFICACIÓN COMPLETADA ===\n');
  
  const allChecksPass = Object.values(checks).every(v => v);
  
  if (allChecksPass) {
    console.log('🎉 Todas las verificaciones pasaron exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Configura los webhooks en MercadoPago');
    console.log('   2. Prueba crear una suscripción desde el frontend');
    console.log('   3. Prueba el flujo completo de pago');
    console.log('   4. Implementa recordatorios de renovación\n');
  } else {
    console.log('⚠️  Algunas verificaciones fallaron');
    console.log('   Revisa los errores arriba y corrige la configuración\n');
    process.exit(1);
  }
}

// Ejecutar verificación
verifyMercadoPagoConfig().catch(error => {
  console.error('\n❌ Error ejecutando verificación:', error);
  process.exit(1);
});

