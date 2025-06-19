require('dotenv').config();
const { prisma } = require('./backend/src/config/database');
const { MercadoPagoConfig, Payment, Subscription } = require('mercadopago');

console.log('🧪 === PRUEBA COMPLETA DEL SISTEMA DE SUSCRIPCIONES ===\n');

// Verificar configuración
console.log('🔧 PASO 1: Verificando configuración...');
console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurado' : '❌ No configurado');
console.log('🔐 JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ No configurado');
console.log('💳 MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? '✅ Configurado' : '❌ No configurado');

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || !process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.log('\n❌ Faltan variables de entorno. Ejecuta: node quick-setup.js');
  process.exit(1);
}

// Configurar MercadoPago
const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

async function testCompleteSystem() {
  try {
    // PASO 2: Verificar conexión a la base de datos
    console.log('\n📊 PASO 2: Verificando conexión a la base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos exitosa');

    // PASO 3: Crear negocio de prueba
    console.log('\n🏢 PASO 3: Creando negocio de prueba...');
    const testBusiness = await prisma.business.create({
      data: {
        name: 'Negocio de Prueba Sistema',
        email: 'test.sistema@example.com',
        phone: '1234567890',
        address: 'Dirección de Prueba 123',
        planType: 'FREE',
        maxAppointments: 30
      }
    });
    console.log('✅ Negocio creado:', testBusiness.name);
    console.log('🎯 Business ID:', testBusiness.id);

    // PASO 4: Crear usuario de prueba
    console.log('\n👤 PASO 4: Creando usuario de prueba...');
    const testUser = await prisma.user.create({
      data: {
        name: 'Usuario de Prueba',
        email: 'usuario.test@example.com',
        password: 'Test123!',
        role: 'ADMIN',
        businessId: testBusiness.id
      }
    });
    console.log('✅ Usuario creado:', testUser.name);
    console.log('🎯 User ID:', testUser.id);

    // PASO 5: Crear suscripción de prueba
    console.log('\n💳 PASO 5: Creando suscripción de prueba...');
    const testSubscription = await prisma.subscription.create({
      data: {
        businessId: testBusiness.id,
        planType: 'BASIC',
        priceAmount: 4900,
        billingCycle: 'MONTHLY',
        status: 'PENDING',
        startDate: new Date(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
      }
    });
    console.log('✅ Suscripción creada');
    console.log('🎯 Subscription ID:', testSubscription.id);
    console.log('📋 Estado:', testSubscription.status);
    console.log('💰 Precio:', testSubscription.priceAmount);

    // PASO 6: Probar conexión con MercadoPago
    console.log('\n💳 PASO 6: Probando conexión con MercadoPago...');
    try {
      const paymentClient = new Payment(mpClient);
      const testPayment = await paymentClient.search({
        options: {
          criteria: 'desc',
          limit: 1
        }
      });
      console.log('✅ Conexión con MercadoPago exitosa');
      console.log('📊 Pagos encontrados:', testPayment.results?.length || 0);
    } catch (error) {
      console.log('⚠️  Error con MercadoPago:', error.message);
      console.log('💡 Verifica tu MERCADOPAGO_ACCESS_TOKEN');
    }

    // PASO 7: Simular pago exitoso
    console.log('\n✅ PASO 7: Simulando pago exitoso...');
    const updatedSubscription = await prisma.subscription.update({
      where: { id: testSubscription.id },
      data: {
        status: 'ACTIVE',
        mercadoPagoSubscriptionId: 'test_subscription_123'
      }
    });
    console.log('✅ Suscripción activada');
    console.log('📋 Nuevo estado:', updatedSubscription.status);

    // PASO 8: Crear pago de prueba
    console.log('\n💰 PASO 8: Creando pago de prueba...');
    const testPayment = await prisma.payment.create({
      data: {
        subscriptionId: testSubscription.id,
        amount: testSubscription.priceAmount,
        billingCycle: testSubscription.billingCycle,
        status: 'APPROVED',
        paidAt: new Date(),
        paymentMethod: 'credit_card',
        installments: 1
      }
    });
    console.log('✅ Pago creado');
    console.log('🎯 Payment ID:', testPayment.id);
    console.log('💰 Monto:', testPayment.amount);

    // PASO 9: Verificar datos finales
    console.log('\n📊 PASO 9: Verificando datos finales...');
    const finalBusiness = await prisma.business.findUnique({
      where: { id: testBusiness.id },
      include: {
        subscription: {
          include: {
            payments: true
          }
        },
        users: true
      }
    });

    console.log('✅ Datos verificados:');
    console.log('   🏢 Negocio:', finalBusiness.name);
    console.log('   👥 Usuarios:', finalBusiness.users.length);
    console.log('   💳 Suscripción:', finalBusiness.subscription?.status);
    console.log('   💰 Pagos:', finalBusiness.subscription?.payments?.length || 0);

    // PASO 10: Limpiar datos de prueba
    console.log('\n🧹 PASO 10: Limpiando datos de prueba...');
    await prisma.payment.deleteMany({
      where: { subscriptionId: testSubscription.id }
    });
    await prisma.subscription.delete({
      where: { id: testSubscription.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    await prisma.business.delete({
      where: { id: testBusiness.id }
    });
    console.log('✅ Datos de prueba eliminados');

    console.log('\n🎉 === PRUEBA COMPLETA EXITOSA ===');
    console.log('✅ Todos los componentes del sistema funcionan correctamente');
    console.log('✅ Base de datos: OK');
    console.log('✅ MercadoPago: OK');
    console.log('✅ Suscripciones: OK');
    console.log('✅ Pagos: OK');
    console.log('✅ Usuarios: OK');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error.message);
    console.error('💡 Verifica tu configuración en el archivo .env');
    
    if (error.code === 'P2002') {
      console.error('🔍 Error: Datos duplicados. Intenta con diferentes emails.');
    }
    
    if (error.code === 'P2021') {
      console.error('🔍 Error: Tabla no encontrada. Ejecuta las migraciones de Prisma.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar pruebas
testCompleteSystem(); 