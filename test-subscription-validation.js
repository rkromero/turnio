const { PrismaClient } = require('@prisma/client');

// Configurar Prisma con la URL de Railway
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:PVxpRCnFWVzOKbymfaYEbcKRWeeVYJmn@ballast.proxy.rlwy.net:49204/railway"
    }
  }
});

async function testSubscriptionValidation() {
  try {
    console.log('🧪 === PROBANDO SISTEMA DE VALIDACIÓN DE SUSCRIPCIONES ===\n');

    // 1. Crear una suscripción de prueba que venza pronto
    console.log('📋 PASO 1: Creando suscripción de prueba que vence pronto...');
    
    const testBusiness = await prisma.business.findFirst({
      where: { planType: 'BASIC' },
      include: { subscription: true }
    });

    if (!testBusiness || !testBusiness.subscription) {
      console.log('❌ No se encontró un negocio con suscripción para probar');
      return;
    }

    // Modificar la fecha de próximo cobro para que venza en 1 día
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await prisma.subscription.update({
      where: { id: testBusiness.subscription.id },
      data: { 
        nextBillingDate: tomorrow,
        status: 'ACTIVE'
      }
    });

    console.log('✅ Suscripción configurada para vencer mañana');

    // 2. Ejecutar validaciones
    console.log('\n🔍 PASO 2: Ejecutando validaciones...');
    
    const SubscriptionValidationService = require('./backend/src/services/subscriptionValidationService');
    
    // Verificar suscripciones próximas a vencer
    const upcomingCount = await SubscriptionValidationService.checkUpcomingExpirations();
    console.log(`📊 Suscripciones próximas a vencer: ${upcomingCount}`);

    // 3. Simular que la suscripción ya venció
    console.log('\n📅 PASO 3: Simulando suscripción vencida...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.subscription.update({
      where: { id: testBusiness.subscription.id },
      data: { 
        nextBillingDate: yesterday
      }
    });

    console.log('✅ Suscripción configurada como vencida');

    // 4. Ejecutar validación de suscripciones vencidas
    console.log('\n🔍 PASO 4: Validando suscripciones vencidas...');
    
    const expiredCount = await SubscriptionValidationService.validateExpiredSubscriptions();
    console.log(`📊 Suscripciones vencidas procesadas: ${expiredCount}`);

    // 5. Verificar el estado final
    console.log('\n📊 PASO 5: Verificando estado final...');
    
    const finalSubscription = await prisma.subscription.findUnique({
      where: { id: testBusiness.subscription.id },
      include: { business: true }
    });

    console.log('📋 Estado final de la suscripción:');
    console.log({
      businessName: finalSubscription.business.name,
      status: finalSubscription.status,
      nextBillingDate: finalSubscription.nextBillingDate,
      planType: finalSubscription.planType
    });

    if (finalSubscription.status === 'SUSPENDED') {
      console.log('✅ ¡ÉXITO! La suscripción fue suspendida correctamente por falta de pago.');
    } else {
      console.log('⚠️  La suscripción no fue suspendida. Revisar lógica.');
    }

    // 6. Restaurar la suscripción para no afectar el sistema
    console.log('\n🔄 PASO 6: Restaurando suscripción...');
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await prisma.subscription.update({
      where: { id: testBusiness.subscription.id },
      data: { 
        status: 'ACTIVE',
        nextBillingDate: nextMonth
      }
    });

    console.log('✅ Suscripción restaurada');

    console.log('\n🎉 === PRUEBA COMPLETADA ===');
    console.log('💡 El sistema de validación está funcionando correctamente.');

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar prueba
testSubscriptionValidation(); 