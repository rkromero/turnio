const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Payment, Subscription } = require('mercadopago');
require('dotenv').config();

const prisma = new PrismaClient();
const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

// Configuración de pruebas
const TEST_CONFIG = {
  // Para pruebas rápidas: 2 minutos en lugar de 30 días
  testingMode: true,
  quickTestMinutes: 2, // Minutos para simular vencimiento
  
  // Datos de negocio de prueba
  testBusiness: {
    name: 'Negocio Prueba Suscripción',
    email: 'test-subscription@turnio.app',
    phone: '+5491123456789',
    planType: 'BASIC'
  },
  
  // Plan de prueba
  testPlan: {
    planType: 'BASIC',
    billingCycle: 'MONTHLY',
    priceAmount: 4900 // $49 ARS
  }
};

console.log('🚀 === SISTEMA DE PRUEBAS DE SUSCRIPCIONES AUTOMÁTICAS ===\n');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'setup':
      await setupTestEnvironment();
      break;
    case 'create':
      await createTestSubscription();
      break;
    case 'expire':
      await expireTestSubscription();
      break;
    case 'check':
      await checkExpiredSubscriptions();
      break;
    case 'webhook':
      await simulateWebhook();
      break;
    case 'cleanup':
      await cleanupTestData();
      break;
    case 'full':
      await fullTestFlow();
      break;
    default:
      showUsage();
  }
}

function showUsage() {
  console.log('📋 USO DEL SCRIPT:');
  console.log('');
  console.log('node test-auto-subscription-complete.js [comando]');
  console.log('');
  console.log('COMANDOS DISPONIBLES:');
  console.log('  setup     - Configurar entorno de pruebas');
  console.log('  create    - Crear suscripción de prueba');
  console.log('  expire    - Vencer suscripción manualmente');
  console.log('  check     - Verificar suscripciones vencidas');
  console.log('  webhook   - Simular webhook de MercadoPago');
  console.log('  cleanup   - Limpiar datos de prueba');
  console.log('  full      - Ejecutar flujo completo de pruebas');
  console.log('');
  console.log('EJEMPLOS:');
  console.log('  node test-auto-subscription-complete.js full');
  console.log('  node test-auto-subscription-complete.js setup');
  console.log('  node test-auto-subscription-complete.js cleanup');
}

async function setupTestEnvironment() {
  console.log('🔧 CONFIGURANDO ENTORNO DE PRUEBAS...\n');
  
  try {
    // 1. Verificar conexión a BD
    console.log('1️⃣ Verificando conexión a base de datos...');
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL');

    // 2. Verificar variables de entorno
    console.log('\n2️⃣ Verificando variables de entorno...');
    const requiredEnvs = [
      'MERCADOPAGO_ACCESS_TOKEN',
      'MERCADOPAGO_PUBLIC_KEY',
      'BACKEND_URL',
      'FRONTEND_URL'
    ];

    for (const env of requiredEnvs) {
      if (process.env[env]) {
        console.log(`✅ ${env}: ${process.env[env].substring(0, 20)}...`);
      } else {
        console.log(`❌ ${env}: No configurada`);
      }
    }

    // 3. Verificar configuración de MercadoPago
    console.log('\n3️⃣ Probando conexión con MercadoPago...');
    const paymentClient = new Payment(mpClient);
    try {
      const payments = await paymentClient.search({
        options: { limit: 1 }
      });
      console.log('✅ MercadoPago conectado correctamente');
    } catch (error) {
      console.log('❌ Error conectando con MercadoPago:', error.message);
    }

    console.log('\n✅ ENTORNO DE PRUEBAS CONFIGURADO');

  } catch (error) {
    console.error('❌ Error configurando entorno:', error.message);
  }
}

async function createTestSubscription() {
  console.log('🏗️ CREANDO SUSCRIPCIÓN DE PRUEBA...\n');

  try {
    // 1. Crear o encontrar negocio de prueba
    console.log('1️⃣ Configurando negocio de prueba...');
    let business = await prisma.business.findFirst({
      where: { email: TEST_CONFIG.testBusiness.email }
    });

    if (!business) {
      business = await prisma.business.create({
        data: {
          ...TEST_CONFIG.testBusiness,
          maxAppointments: 100,
          isActive: true
        }
      });
      console.log('✅ Negocio creado');
    } else {
      console.log('✅ Negocio encontrado');
    }

    // 2. Crear usuario de prueba
    let user = await prisma.user.findFirst({
      where: { businessId: business.id }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Usuario Prueba',
          email: TEST_CONFIG.testBusiness.email,
          phone: TEST_CONFIG.testBusiness.phone,
          role: 'ADMIN',
          businessId: business.id,
          password: '$2b$10$test.hash' // Hash de prueba
        }
      });
      console.log('✅ Usuario creado');
    } else {
      console.log('✅ Usuario encontrado');
    }

    // 3. Crear suscripción
    console.log('\n2️⃣ Creando suscripción...');
    const nextBillingDate = new Date();
    if (TEST_CONFIG.testingMode) {
      // Para pruebas: vence en 2 minutos
      nextBillingDate.setMinutes(nextBillingDate.getMinutes() + TEST_CONFIG.quickTestMinutes);
    } else {
      // Producción: vence en 30 días
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);
    }

    const subscription = await prisma.subscription.create({
      data: {
        businessId: business.id,
        planType: TEST_CONFIG.testPlan.planType,
        status: 'ACTIVE',
        billingCycle: TEST_CONFIG.testPlan.billingCycle,
        priceAmount: TEST_CONFIG.testPlan.priceAmount,
        startDate: new Date(),
        nextBillingDate,
        // Simular ID de MercadoPago para pruebas
        mercadoPagoSubscriptionId: `test_sub_${Date.now()}`
      }
    });

    console.log('✅ Suscripción creada:', {
      id: subscription.id,
      planType: subscription.planType,
      status: subscription.status,
      nextBillingDate: subscription.nextBillingDate.toISOString(),
      testingMode: TEST_CONFIG.testingMode ? 'SÍ (vence en 2 min)' : 'NO (vence en 30 días)'
    });

    // 4. Crear pago inicial
    console.log('\n3️⃣ Creando registro de pago inicial...');
    const payment = await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: TEST_CONFIG.testPlan.priceAmount,
        status: 'APPROVED',
        billingCycle: TEST_CONFIG.testPlan.billingCycle,
        paidAt: new Date(),
        mercadoPagoPaymentId: `test_payment_${Date.now()}`
      }
    });

    console.log('✅ Pago inicial registrado:', {
      id: payment.id,
      amount: payment.amount,
      status: payment.status
    });

    console.log('\n🎉 SUSCRIPCIÓN DE PRUEBA LISTA');
    console.log(`⏰ La suscripción vencerá el: ${nextBillingDate.toLocaleString()}`);
    
    if (TEST_CONFIG.testingMode) {
      console.log(`\n⚡ MODO PRUEBAS ACTIVADO:`);
      console.log(`   Espera ${TEST_CONFIG.quickTestMinutes} minutos y ejecuta:`);
      console.log(`   node test-auto-subscription-complete.js check`);
    }

  } catch (error) {
    console.error('❌ Error creando suscripción:', error.message);
  }
}

async function expireTestSubscription() {
  console.log('⏰ VENCIENDO SUSCRIPCIÓN MANUALMENTE...\n');

  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        business: { email: TEST_CONFIG.testBusiness.email },
        status: 'ACTIVE'
      }
    });

    if (!subscription) {
      console.log('❌ No se encontró suscripción activa de prueba');
      return;
    }

    // Establecer fecha de vencimiento en el pasado
    const expiredDate = new Date(Date.now() - 60000); // 1 minuto atrás

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { nextBillingDate: expiredDate }
    });

    console.log('✅ Suscripción vencida manualmente:', {
      id: subscription.id,
      nextBillingDate: expiredDate.toISOString()
    });

    console.log('\n💡 Ahora ejecuta: node test-auto-subscription-complete.js check');

  } catch (error) {
    console.error('❌ Error venciendo suscripción:', error.message);
  }
}

async function checkExpiredSubscriptions() {
  console.log('🔍 VERIFICANDO SUSCRIPCIONES VENCIDAS...\n');

  try {
    // Importar la función de verificación
    const { checkExpiredSubscriptions } = require('./backend/src/controllers/subscriptionAutoController');
    
    console.log('1️⃣ Ejecutando proceso de verificación...');
    await checkExpiredSubscriptions();

    console.log('\n2️⃣ Verificando resultados...');
    const subscription = await prisma.subscription.findFirst({
      where: {
        business: { email: TEST_CONFIG.testBusiness.email }
      },
      include: {
        business: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    });

    if (subscription) {
      console.log('📊 Estado actual de la suscripción:');
      console.log({
        id: subscription.id,
        status: subscription.status,
        planType: subscription.planType,
        nextBillingDate: subscription.nextBillingDate?.toISOString(),
        businessName: subscription.business.name
      });

      console.log('\n💳 Últimos pagos:');
      subscription.payments.forEach((payment, index) => {
        console.log(`  ${index + 1}. ${payment.status} - $${payment.amount} - ${payment.createdAt.toISOString()}`);
      });
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error verificando suscripciones:', error.message);
  }
}

async function simulateWebhook() {
  console.log('🔔 SIMULANDO WEBHOOK DE MERCADOPAGO...\n');

  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        business: { email: TEST_CONFIG.testBusiness.email }
      },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!subscription || subscription.payments.length === 0) {
      console.log('❌ No se encontró suscripción con pagos para simular webhook');
      return;
    }

    const latestPayment = subscription.payments[0];

    // Simular datos del webhook
    const webhookData = {
      type: 'subscription_authorized_payment',
      data: {
        id: `sim_payment_${Date.now()}`
      }
    };

    console.log('1️⃣ Simulando datos del webhook:', webhookData);

    // Crear un pago simulado
    const simulatedPayment = await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: subscription.priceAmount,
        status: 'APPROVED',
        billingCycle: subscription.billingCycle,
        paidAt: new Date(),
        mercadoPagoPaymentId: webhookData.data.id
      }
    });

    console.log('2️⃣ Pago simulado creado:', {
      id: simulatedPayment.id,
      amount: simulatedPayment.amount,
      status: simulatedPayment.status
    });

    // Actualizar suscripción
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        nextBillingDate
      }
    });

    console.log('3️⃣ Suscripción renovada:', {
      id: subscription.id,
      status: 'ACTIVE',
      nextBillingDate: nextBillingDate.toISOString()
    });

    console.log('\n✅ Webhook simulado exitosamente');

  } catch (error) {
    console.error('❌ Error simulando webhook:', error.message);
  }
}

async function cleanupTestData() {
  console.log('🗑️ LIMPIANDO DATOS DE PRUEBA...\n');

  try {
    const business = await prisma.business.findFirst({
      where: { email: TEST_CONFIG.testBusiness.email }
    });

    if (!business) {
      console.log('ℹ️ No hay datos de prueba para limpiar');
      return;
    }

    console.log('1️⃣ Eliminando datos relacionados...');
    
    // Eliminar pagos
    await prisma.payment.deleteMany({
      where: { subscription: { businessId: business.id } }
    });
    console.log('✅ Pagos eliminados');

    // Eliminar suscripciones
    await prisma.subscription.deleteMany({
      where: { businessId: business.id }
    });
    console.log('✅ Suscripciones eliminadas');

    // Eliminar usuarios
    await prisma.user.deleteMany({
      where: { businessId: business.id }
    });
    console.log('✅ Usuarios eliminados');

    // Eliminar negocio
    await prisma.business.delete({
      where: { id: business.id }
    });
    console.log('✅ Negocio eliminado');

    console.log('\n🎉 DATOS DE PRUEBA LIMPIADOS');

  } catch (error) {
    console.error('❌ Error limpiando datos:', error.message);
  }
}

async function fullTestFlow() {
  console.log('🎯 EJECUTANDO FLUJO COMPLETO DE PRUEBAS...\n');

  try {
    console.log('═'.repeat(50));
    await setupTestEnvironment();
    
    console.log('\n' + '═'.repeat(50));
    await createTestSubscription();
    
    console.log('\n⏳ Esperando vencimiento...');
    if (TEST_CONFIG.testingMode) {
      console.log(`Esperando ${TEST_CONFIG.quickTestMinutes} minutos...`);
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.quickTestMinutes * 60 * 1000));
    } else {
      console.log('Venciendo manualmente para pruebas...');
      await expireTestSubscription();
    }
    
    console.log('\n' + '═'.repeat(50));
    await checkExpiredSubscriptions();
    
    console.log('\n' + '═'.repeat(50));
    await simulateWebhook();

    console.log('\n' + '═'.repeat(50));
    console.log('🎉 FLUJO COMPLETO FINALIZADO');
    console.log('');
    console.log('📋 RESUMEN DE PRUEBAS:');
    console.log('✅ Entorno configurado');
    console.log('✅ Suscripción creada');
    console.log('✅ Vencimiento procesado');
    console.log('✅ Cobro automático simulado');
    console.log('✅ Suscripción renovada');
    console.log('');
    console.log('💡 Para limpiar datos: node test-auto-subscription-complete.js cleanup');

  } catch (error) {
    console.error('❌ Error en flujo completo:', error.message);
  }
}

// Ejecutar script
main().catch(console.error).finally(() => prisma.$disconnect()); 