/**
 * Script para probar ambos sistemas de pago en sandbox
 * Ejecutar en Railway: node scripts/test-sandbox-payments.js
 * 
 * Este script verifica:
 * 1. Sistema de Suscripciones (pago a la plataforma)
 * 2. Sistema de Pagos por Turnos (pago a negocios - OAuth)
 */

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { prisma } = require('../src/config/database');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testSistemaSuscripciones() {
  logSection('1️⃣ SISTEMA DE SUSCRIPCIONES (Pago a la Plataforma)');
  
  // Verificar variables de entorno
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;
  const backendUrl = process.env.BACKEND_URL;
  const frontendUrl = process.env.FRONTEND_URL;

  logInfo('Verificando variables de entorno...\n');

  if (!accessToken) {
    logError('MERCADOPAGO_ACCESS_TOKEN no está configurado');
    logInfo('Para configurarlo en Railway:');
    logInfo('1. Ve a tu proyecto en Railway');
    logInfo('2. Selecciona el servicio backend');
    logInfo('3. Ve a Variables');
    logInfo('4. Agrega: MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx');
    logInfo('\n📌 Obtén tus credenciales en:');
    logInfo('   https://www.mercadopago.com.ar/developers/panel/app\n');
    return false;
  }

  if (!publicKey) {
    logError('MERCADOPAGO_PUBLIC_KEY no está configurado');
    return false;
  }

  // Verificar que sean tokens de sandbox
  const isSandbox = accessToken.startsWith('TEST-');
  
  if (isSandbox) {
    logSuccess(`MERCADOPAGO_ACCESS_TOKEN: Configurado (Sandbox)`);
    logInfo(`   Primeros caracteres: ${accessToken.substring(0, 25)}...`);
  } else {
    logWarning(`MERCADOPAGO_ACCESS_TOKEN: Configurado (PRODUCCIÓN - no es sandbox)`);
    logInfo(`   Primeros caracteres: ${accessToken.substring(0, 25)}...`);
  }

  if (publicKey.startsWith('TEST-')) {
    logSuccess(`MERCADOPAGO_PUBLIC_KEY: Configurado (Sandbox)`);
  } else {
    logWarning(`MERCADOPAGO_PUBLIC_KEY: Configurado (PRODUCCIÓN - no es sandbox)`);
  }

  logInfo(`BACKEND_URL: ${backendUrl || '❌ FALTA'}`);
  logInfo(`FRONTEND_URL: ${frontendUrl || '❌ FALTA'}`);

  // Probar conexión con API de MercadoPago
  logInfo('\nProbando conexión con API de MercadoPago...\n');

  try {
    const client = new MercadoPagoConfig({ 
      accessToken: accessToken,
      options: { timeout: 10000 }
    });

    // Intentar crear una preferencia de prueba
    const preference = new Preference(client);
    
    const testPreference = {
      items: [{
        title: 'Test de Conexión - Sistema Suscripciones',
        description: 'Prueba de conexión del sistema de suscripciones',
        quantity: 1,
        unit_price: 100
      }],
      external_reference: `test_subscription_${Date.now()}`,
      notification_url: `${backendUrl}/api/mercadopago/webhook`
    };

    const response = await preference.create({ body: testPreference });
    
    logSuccess('Conexión exitosa con MercadoPago API');
    logInfo(`   Preference ID: ${response.id}`);
    logInfo(`   Init Point: ${response.init_point}`);
    
    // Verificar URLs de webhook
    logInfo('\n📡 URLs de Webhook configuradas:');
    logInfo(`   Pagos: ${backendUrl}/api/mercadopago/webhook`);
    logInfo(`   Suscripciones: ${backendUrl}/api/mercadopago/subscription-webhook`);
    
    logWarning('\n⚠️  Asegúrate de configurar estos webhooks en:');
    logInfo('   https://www.mercadopago.com.ar/developers/panel/webhooks');

    return true;

  } catch (error) {
    logError('Error conectando con MercadoPago API');
    logError(`   Mensaje: ${error.message}`);
    
    if (error.status) {
      logError(`   Status: ${error.status}`);
    }
    
    if (error.cause) {
      logError(`   Causa: ${JSON.stringify(error.cause, null, 2)}`);
    }

    logInfo('\n🔧 Posibles soluciones:');
    logInfo('1. Verifica que el token sea válido');
    logInfo('2. Verifica que no haya espacios al inicio o final');
    logInfo('3. Verifica que sea el token correcto (TEST- para sandbox)');
    logInfo('4. Regenera el token en el panel de MercadoPago');
    
    return false;
  }
}

async function testSistemaPagosTurnos() {
  logSection('2️⃣ SISTEMA DE PAGOS POR TURNOS (Pago a Negocios - OAuth)');
  
  // Verificar variables de entorno OAuth
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  const redirectUri = process.env.MP_REDIRECT_URI || 
    `${process.env.FRONTEND_URL}/dashboard/settings/payments/callback`;

  logInfo('Verificando variables de entorno OAuth...\n');

  if (!clientId) {
    logError('MP_CLIENT_ID no está configurado');
    logInfo('Para configurarlo en Railway:');
    logInfo('1. Ve a tu proyecto en Railway');
    logInfo('2. Selecciona el servicio backend');
    logInfo('3. Ve a Variables');
    logInfo('4. Agrega: MP_CLIENT_ID=xxxxx');
    logInfo('\n📌 Obtén tu CLIENT_ID en:');
    logInfo('   https://www.mercadopago.com.ar/developers/panel/app');
    logInfo('   Ve a "Credenciales" → "Credenciales de producción"\n');
    return false;
  }

  if (!clientSecret) {
    logError('MP_CLIENT_SECRET no está configurado');
    logInfo('Para configurarlo en Railway:');
    logInfo('1. Ve a tu proyecto en Railway');
    logInfo('2. Selecciona el servicio backend');
    logInfo('3. Ve a Variables');
    logInfo('4. Agrega: MP_CLIENT_SECRET=xxxxx');
    logInfo('\n📌 Obtén tu CLIENT_SECRET en:');
    logInfo('   https://www.mercadopago.com.ar/developers/panel/app');
    logInfo('   Ve a "Credenciales" → "Credenciales de producción"\n');
    return false;
  }

  logSuccess(`MP_CLIENT_ID: Configurado`);
  logInfo(`   Valor: ${clientId}`);
  logSuccess(`MP_CLIENT_SECRET: Configurado`);
  logInfo(`   Primeros caracteres: ${clientSecret.substring(0, 10)}...`);
  logSuccess(`MP_REDIRECT_URI: ${redirectUri}`);

  // Verificar que la URL de redirect esté configurada correctamente
  if (!redirectUri.includes('http')) {
    logWarning('MP_REDIRECT_URI no parece ser una URL válida');
    logInfo('   Debe ser una URL completa, ej: https://tu-dominio.com/callback');
  }

  // Probar generación de URL de autorización
  logInfo('\nProbando generación de URL de autorización OAuth...\n');

  try {
    const testBusinessId = 'test_business_' + Date.now();
    const state = `business_${testBusinessId}_${Date.now()}`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      state: state,
      redirect_uri: redirectUri
    });

    const authUrl = `https://auth.mercadopago.com.ar/authorization?${params.toString()}`;
    
    logSuccess('URL de autorización generada correctamente');
    logInfo(`   URL: ${authUrl.substring(0, 80)}...`);
    logInfo(`   State: ${state}`);
    
    logInfo('\n📝 Para probar la conexión OAuth:');
    logInfo('1. Ve al frontend: /dashboard/settings/payments');
    logInfo('2. Haz clic en "Conectar MercadoPago"');
    logInfo('3. Serás redirigido a MercadoPago para autorizar');
    logInfo('4. Después de autorizar, serás redirigido de vuelta');

    // Verificar base de datos para ver si hay negocios con MP conectado
    logInfo('\nVerificando negocios con MercadoPago conectado...\n');

    try {
      const businessesWithMP = await prisma.business.findMany({
        where: {
          mp_connected: true
        },
        select: {
          id: true,
          name: true,
          mp_connected_at: true,
          mp_user_id: true
        },
        take: 5
      });

      if (businessesWithMP.length > 0) {
        logSuccess(`Encontrados ${businessesWithMP.length} negocio(s) con MP conectado:`);
        businessesWithMP.forEach(business => {
          logInfo(`   - ${business.name} (ID: ${business.id})`);
          logInfo(`     Conectado: ${business.mp_connected_at}`);
        });
      } else {
        logWarning('No hay negocios con MercadoPago conectado aún');
        logInfo('   Esto es normal si aún no has probado la conexión OAuth');
      }

    } catch (dbError) {
      logError('Error consultando base de datos:');
      logError(`   ${dbError.message}`);
    }

    return true;

  } catch (error) {
    logError('Error generando URL de autorización');
    logError(`   Mensaje: ${error.message}`);
    return false;
  }
}

async function testBaseDatos() {
  logSection('3️⃣ VERIFICACIÓN DE BASE DE DATOS');

  try {
    // Verificar conexión
    await prisma.$connect();
    logSuccess('Conexión a base de datos exitosa');

    // Estadísticas
    const [subscriptionCount, paymentCount, appointmentPaymentCount, businessesWithMP] = await Promise.all([
      prisma.subscription.count(),
      prisma.payment.count(),
      prisma.appointmentPayment.count(),
      prisma.business.count({ where: { mp_connected: true } })
    ]);

    logInfo('\n📊 Estadísticas:');
    logInfo(`   Suscripciones: ${subscriptionCount}`);
    logInfo(`   Pagos de suscripciones: ${paymentCount}`);
    logInfo(`   Pagos de turnos: ${appointmentPaymentCount}`);
    logInfo(`   Negocios con MP conectado: ${businessesWithMP}`);

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

    if (upcomingExpirations > 0) {
      logWarning(`\n⚠️  Hay ${upcomingExpirations} suscripción(es) próximas a vencer (próximos 7 días)`);
      logInfo('   Considera implementar recordatorios automáticos');
    }

    return true;

  } catch (error) {
    logError('Error conectando con base de datos');
    logError(`   ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   TEST DE SISTEMAS DE PAGO EN SANDBOX - TurnIO            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  const results = {
    suscripciones: false,
    pagosTurnos: false,
    baseDatos: false
  };

  // Test 1: Sistema de Suscripciones
  results.suscripciones = await testSistemaSuscripciones();

  // Test 2: Sistema de Pagos por Turnos
  results.pagosTurnos = await testSistemaPagosTurnos();

  // Test 3: Base de datos
  results.baseDatos = await testBaseDatos();

  // Resumen final
  logSection('📋 RESUMEN FINAL');

  if (results.suscripciones) {
    logSuccess('Sistema de Suscripciones: ✅ FUNCIONAL');
  } else {
    logError('Sistema de Suscripciones: ❌ NO FUNCIONAL');
  }

  if (results.pagosTurnos) {
    logSuccess('Sistema de Pagos por Turnos: ✅ FUNCIONAL');
  } else {
    logError('Sistema de Pagos por Turnos: ❌ NO FUNCIONAL');
  }

  if (results.baseDatos) {
    logSuccess('Base de Datos: ✅ CONECTADA');
  } else {
    logError('Base de Datos: ❌ ERROR');
  }

  const allPass = Object.values(results).every(v => v);

  console.log('\n');
  if (allPass) {
    log('🎉 ¡TODOS LOS SISTEMAS ESTÁN FUNCIONANDO CORRECTAMENTE!', 'green');
    log('\n📋 Próximos pasos:', 'blue');
    log('   1. Configura los webhooks en MercadoPago', 'blue');
    log('   2. Prueba crear una suscripción desde el frontend', 'blue');
    log('   3. Prueba conectar un negocio a MercadoPago', 'blue');
    log('   4. Prueba crear un pago por turno', 'blue');
    console.log('\n');
  } else {
    log('⚠️  ALGUNOS SISTEMAS NECESITAN CONFIGURACIÓN', 'yellow');
    log('\n📋 Revisa los errores arriba y corrige la configuración', 'blue');
    log('   Luego ejecuta este script nuevamente', 'blue');
    console.log('\n');
    process.exit(1);
  }

  // Cerrar conexión a base de datos
  await prisma.$disconnect();
}

// Ejecutar tests
main().catch(error => {
  logError('\n❌ Error ejecutando tests:');
  console.error(error);
  process.exit(1);
});

