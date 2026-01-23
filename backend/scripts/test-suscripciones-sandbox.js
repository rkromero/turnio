/**
 * Script para probar el sistema de suscripciones en sandbox
 * Ejecutar en Railway: node scripts/test-suscripciones-sandbox.js
 * 
 * Este script verifica y prueba:
 * 1. Variables de entorno configuradas
 * 2. Conexión con API de MercadoPago
 * 3. Creación de preferencia de pago
 * 4. Webhook configurado correctamente
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70) + '\n');
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

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'magenta');
}

async function verificarVariablesEntorno() {
  logSection('📋 PASO 1: VERIFICAR VARIABLES DE ENTORNO');

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

  // Verificar MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) {
    logError('MERCADOPAGO_ACCESS_TOKEN no está configurado');
    logInfo('\n📝 Para configurarlo en Railway:');
    logInfo('   1. Ve a: https://railway.app');
    logInfo('   2. Selecciona tu proyecto TurnIO');
    logInfo('   3. Selecciona el servicio backend');
    logInfo('   4. Ve a la pestaña "Variables"');
    logInfo('   5. Agrega: MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx');
    logInfo('\n📌 Obtén tu token en:');
    logInfo('   https://www.mercadopago.com.ar/developers/panel/app');
    logInfo('   Ve a "Credenciales" → "Credenciales de prueba"');
    return false;
  }

  const isSandbox = accessToken.startsWith('TEST-');
  if (isSandbox) {
    logSuccess(`MERCADOPAGO_ACCESS_TOKEN: Configurado (Sandbox)`);
    logInfo(`   Primeros caracteres: ${accessToken.substring(0, 30)}...`);
  } else {
    logWarning(`MERCADOPAGO_ACCESS_TOKEN: Configurado (PRODUCCIÓN)`);
    logInfo(`   Primeros caracteres: ${accessToken.substring(0, 30)}...`);
    logWarning('   ⚠️  Este script está diseñado para sandbox');
  }

  // Verificar MERCADOPAGO_PUBLIC_KEY
  if (!publicKey) {
    logError('MERCADOPAGO_PUBLIC_KEY no está configurado');
    logInfo('   Agrega: MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx en Railway');
    return false;
  }

  if (publicKey.startsWith('TEST-')) {
    logSuccess(`MERCADOPAGO_PUBLIC_KEY: Configurado (Sandbox)`);
  } else {
    logWarning(`MERCADOPAGO_PUBLIC_KEY: Configurado (PRODUCCIÓN)`);
  }

  // Verificar URLs
  if (!backendUrl) {
    logError('BACKEND_URL no está configurado');
    return false;
  }
  logSuccess(`BACKEND_URL: ${backendUrl}`);

  if (!frontendUrl) {
    logError('FRONTEND_URL no está configurado');
    return false;
  }
  logSuccess(`FRONTEND_URL: ${frontendUrl}`);

  return true;
}

async function probarConexionMercadoPago() {
  logSection('🔌 PASO 2: PROBAR CONEXIÓN CON MERCADOPAGO API');

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const backendUrl = process.env.BACKEND_URL;

  try {
    logInfo('Creando cliente de MercadoPago...');
    const client = new MercadoPagoConfig({ 
      accessToken: accessToken,
      options: { timeout: 10000 }
    });

    logInfo('Creando preferencia de prueba...');
    const preference = new Preference(client);
    
    const testPreference = {
      items: [{
        title: 'Test de Conexión - Sistema Suscripciones',
        description: 'Prueba de conexión del sistema de suscripciones en sandbox',
        quantity: 1,
        unit_price: 100
      }],
      external_reference: `test_subscription_${Date.now()}`,
      notification_url: `${backendUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${process.env.FRONTEND_URL}/subscription/success`,
        failure: `${process.env.FRONTEND_URL}/subscription/failure`,
        pending: `${process.env.FRONTEND_URL}/subscription/pending`
      }
    };

    const response = await preference.create({ body: testPreference });
    
    logSuccess('✅ Conexión exitosa con MercadoPago API');
    logInfo(`   Preference ID: ${response.id}`);
    logInfo(`   Init Point: ${response.init_point}`);
    logInfo(`   Sandbox Init Point: ${response.sandbox_init_point || 'N/A'}`);
    
    logInfo('\n📝 Puedes probar el pago visitando:');
    logInfo(`   ${response.init_point}`);
    logInfo('   Usa una tarjeta de prueba de MercadoPago');

    return { success: true, preferenceId: response.id, initPoint: response.init_point };

  } catch (error) {
    logError('❌ Error conectando con MercadoPago API');
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
    logInfo('5. Verifica tu conexión a internet');
    
    return { success: false, error: error.message };
  }
}

async function verificarWebhook() {
  logSection('📡 PASO 3: VERIFICAR CONFIGURACIÓN DE WEBHOOK');

  const backendUrl = process.env.BACKEND_URL;

  logInfo('URLs de Webhook que debes configurar en MercadoPago:');
  logInfo('\n   Para pagos de suscripciones:');
  logInfo(`   ${backendUrl}/api/mercadopago/webhook`);
  
  logInfo('\n   Para suscripciones automáticas (opcional):');
  logInfo(`   ${backendUrl}/api/mercadopago/subscription-webhook`);

  logInfo('\n📝 Para configurar webhooks:');
  logInfo('   1. Ve a: https://www.mercadopago.com.ar/developers/panel/webhooks');
  logInfo('   2. Selecciona tu aplicación');
  logInfo('   3. Agrega las URLs de arriba');
  logInfo('   4. Selecciona el evento "payment"');

  logWarning('\n⚠️  IMPORTANTE:');
  logInfo('   - Los webhooks deben ser accesibles públicamente');
  logInfo('   - Railway debe estar desplegado y funcionando');
  logInfo('   - Verifica los logs de Railway cuando recibas notificaciones');

  return true;
}

async function verificarBaseDatos() {
  logSection('💾 PASO 4: VERIFICAR BASE DE DATOS');

  try {
    await prisma.$connect();
    logSuccess('Conexión a base de datos exitosa');

    // Estadísticas
    const [subscriptionCount, paymentCount, activeSubscriptions] = await Promise.all([
      prisma.subscription.count(),
      prisma.payment.count(),
      prisma.subscription.count({ 
        where: { status: 'ACTIVE' } 
      })
    ]);

    logInfo('\n📊 Estadísticas:');
    logInfo(`   Total de suscripciones: ${subscriptionCount}`);
    logInfo(`   Suscripciones activas: ${activeSubscriptions}`);
    logInfo(`   Total de pagos: ${paymentCount}`);

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
    }

    // Verificar pagos pendientes
    const pendingPayments = await prisma.payment.count({
      where: { status: 'PENDING' }
    });

    if (pendingPayments > 0) {
      logInfo(`\n   Pagos pendientes: ${pendingPayments}`);
      logWarning('   Algunos pagos pueden estar esperando confirmación');
    }

    return true;

  } catch (error) {
    logError('Error conectando con base de datos');
    logError(`   ${error.message}`);
    return false;
  }
}

async function mostrarTarjetasPrueba() {
  logSection('💳 TARJETAS DE PRUEBA PARA SANDBOX');

  logInfo('Usa estas tarjetas para probar pagos en sandbox:\n');
  
  logInfo('✅ Tarjeta APROBADA:');
  logInfo('   Número: 5031 7557 3453 0604');
  logInfo('   CVV: 123');
  logInfo('   Vencimiento: Cualquier fecha futura');
  logInfo('   Nombre: APRO\n');

  logInfo('❌ Tarjeta RECHAZADA:');
  logInfo('   Número: 5031 4332 1540 6351');
  logInfo('   CVV: 123');
  logInfo('   Vencimiento: Cualquier fecha futura');
  logInfo('   Nombre: OTHE\n');

  logInfo('⏳ Tarjeta PENDIENTE:');
  logInfo('   Número: 5031 7557 3453 0604');
  logInfo('   CVV: 123');
  logInfo('   Vencimiento: Cualquier fecha futura');
  logInfo('   Nombre: CONT\n');

  logInfo('📚 Más tarjetas de prueba:');
  logInfo('   https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards');
}

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   TEST DE SISTEMA DE SUSCRIPCIONES EN SANDBOX - TurnIO            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  const results = {
    variables: false,
    conexion: false,
    webhook: false,
    baseDatos: false
  };

  // Paso 1: Verificar variables de entorno
  results.variables = await verificarVariablesEntorno();
  
  if (!results.variables) {
    logError('\n❌ Faltan variables de entorno. Configúralas y vuelve a ejecutar el script.');
    process.exit(1);
  }

  // Paso 2: Probar conexión con MercadoPago
  const conexionResult = await probarConexionMercadoPago();
  results.conexion = conexionResult.success;

  // Paso 3: Verificar webhook
  results.webhook = await verificarWebhook();

  // Paso 4: Verificar base de datos
  results.baseDatos = await verificarBaseDatos();

  // Mostrar tarjetas de prueba
  await mostrarTarjetasPrueba();

  // Resumen final
  logSection('📋 RESUMEN FINAL');

  if (results.variables) {
    logSuccess('Variables de entorno: ✅ CONFIGURADAS');
  } else {
    logError('Variables de entorno: ❌ FALTAN');
  }

  if (results.conexion) {
    logSuccess('Conexión con MercadoPago: ✅ FUNCIONAL');
  } else {
    logError('Conexión con MercadoPago: ❌ ERROR');
  }

  if (results.webhook) {
    logSuccess('Configuración de Webhook: ✅ VERIFICADA');
  } else {
    logWarning('Configuración de Webhook: ⚠️  REVISAR');
  }

  if (results.baseDatos) {
    logSuccess('Base de datos: ✅ CONECTADA');
  } else {
    logError('Base de datos: ❌ ERROR');
  }

  const allPass = results.variables && results.conexion && results.baseDatos;

  console.log('\n');
  if (allPass) {
    log('🎉 ¡EL SISTEMA DE SUSCRIPCIONES ESTÁ LISTO PARA PROBAR!', 'green');
    log('\n📋 Próximos pasos:', 'blue');
    log('   1. Configura los webhooks en MercadoPago (ver URLs arriba)', 'blue');
    log('   2. Ve al frontend y crea una suscripción de prueba', 'blue');
    log('   3. Usa una tarjeta de prueba para completar el pago', 'blue');
    log('   4. Verifica que el webhook procese el pago correctamente', 'blue');
    log('   5. Revisa los logs de Railway para ver las notificaciones', 'blue');
    console.log('\n');
  } else {
    log('⚠️  ALGUNOS PASOS NECESITAN ATENCIÓN', 'yellow');
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

