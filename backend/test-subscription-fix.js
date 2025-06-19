const { PrismaClient } = require('@prisma/client');

// Configurar Prisma con la URL de Railway directamente
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:PVxpRCnFWVzOKbymfaYEbcKRWeeVYJmn@ballast.proxy.rlwy.net:49204/railway"
    }
  }
});

async function testSubscriptionFix() {
  try {
    console.log('🔍 === PROBANDO CORRECCIÓN DE SUSCRIPCIÓN ===\n');

    // 1. Buscar la suscripción más reciente con status PAYMENT_FAILED
    const subscription = await prisma.subscription.findFirst({
      where: { status: 'PAYMENT_FAILED' },
      orderBy: { createdAt: 'desc' },
      include: { 
        business: true,
        payments: { 
          orderBy: { createdAt: 'desc' },
          take: 1
        } 
      }
    });

    if (!subscription) {
      console.log('❌ No hay suscripciones PAYMENT_FAILED para probar.');
      return;
    }

    console.log('📋 SUSCRIPCIÓN ENCONTRADA:');
    console.log({
      id: subscription.id,
      businessName: subscription.business.name,
      planType: subscription.planType,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      priceAmount: subscription.priceAmount
    });

    if (subscription.payments.length === 0) {
      console.log('❌ No hay pagos asociados a la suscripción.');
      return;
    }

    const payment = subscription.payments[0];
    console.log('\n💳 PAGO ASOCIADO:');
    console.log({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt
    });

    // 2. Si el pago ya está APPROVED, actualizar la suscripción manualmente
    if (payment.status === 'APPROVED') {
      console.log('\n🔄 Actualizando suscripción a ACTIVE...');
      
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE' }
      });

      await prisma.business.update({
        where: { id: subscription.businessId },
        data: { planType: subscription.planType }
      });

      console.log('✅ Suscripción actualizada a ACTIVE correctamente.');
    } else {
      // 3. Si el pago no está APPROVED, forzarlo
      console.log('\n🔄 Forzando pago a APPROVED...');
      
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'APPROVED', 
          paidAt: new Date() 
        }
      });

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE' }
      });

      await prisma.business.update({
        where: { id: subscription.businessId },
        data: { planType: subscription.planType }
      });

      console.log('✅ Pago forzado a APPROVED y suscripción actualizada a ACTIVE.');
    }

    // 4. Verificar el estado final
    const updatedSubscription = await prisma.subscription.findUnique({ 
      where: { id: subscription.id },
      include: { business: true }
    });

    console.log('\n📊 ESTADO FINAL:');
    console.log({
      subscriptionStatus: updatedSubscription.status,
      businessPlanType: updatedSubscription.business.planType,
      paymentStatus: payment.status
    });

    if (updatedSubscription.status === 'ACTIVE') {
      console.log('\n🎉 ¡ÉXITO! La suscripción está ahora ACTIVE.');
    } else {
      console.log('\n❌ ERROR: La suscripción no se actualizó correctamente.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar prueba
testSubscriptionFix(); 