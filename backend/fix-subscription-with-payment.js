const { PrismaClient } = require('@prisma/client');

// Configurar Prisma con la URL de Railway directamente
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:PVxpRCnFWVzOKbymfaYEbcKRWeeVYJmn@ballast.proxy.rlwy.net:49204/railway"
    }
  }
});

async function fixSubscriptionWithPayment() {
  try {
    console.log('🔍 === CORRIGIENDO SUSCRIPCIÓN CON PAGO ===\n');

    // 1. Buscar la suscripción más reciente con status PAYMENT_FAILED
    const subscription = await prisma.subscription.findFirst({
      where: { status: 'PAYMENT_FAILED' },
      orderBy: { createdAt: 'desc' },
      include: { 
        business: true,
        payments: { 
          orderBy: { createdAt: 'desc' }
        } 
      }
    });

    if (!subscription) {
      console.log('❌ No hay suscripciones PAYMENT_FAILED para corregir.');
      return;
    }

    console.log('📋 SUSCRIPCIÓN ENCONTRADA:');
    console.log({
      id: subscription.id,
      businessName: subscription.business.name,
      planType: subscription.planType,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      priceAmount: subscription.priceAmount,
      paymentsCount: subscription.payments.length
    });

    // 2. Si no hay pagos, crear uno de prueba
    if (subscription.payments.length === 0) {
      console.log('\n💳 Creando pago de prueba...');
      
      const payment = await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: subscription.priceAmount,
          currency: subscription.currency || 'ARS',
          status: 'APPROVED',
          billingCycle: subscription.billingCycle,
          paidAt: new Date(),
          paymentMethod: 'credit_card',
          installments: 1
        }
      });

      console.log('✅ Pago de prueba creado:', payment.id);
    }

    // 3. Actualizar la suscripción a ACTIVE
    console.log('\n🔄 Actualizando suscripción a ACTIVE...');
    
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        status: 'ACTIVE',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 días
      }
    });

    // 4. Actualizar el plan del negocio
    await prisma.business.update({
      where: { id: subscription.businessId },
      data: { planType: subscription.planType }
    });

    console.log('✅ Suscripción y negocio actualizados correctamente.');

    // 5. Verificar el estado final
    const updatedSubscription = await prisma.subscription.findUnique({ 
      where: { id: subscription.id },
      include: { 
        business: true,
        payments: { orderBy: { createdAt: 'desc' } }
      }
    });

    console.log('\n📊 ESTADO FINAL:');
    console.log({
      subscriptionStatus: updatedSubscription.status,
      businessPlanType: updatedSubscription.business.planType,
      paymentsCount: updatedSubscription.payments.length,
      nextBillingDate: updatedSubscription.nextBillingDate
    });

    if (updatedSubscription.status === 'ACTIVE') {
      console.log('\n🎉 ¡ÉXITO! La suscripción está ahora ACTIVE.');
      console.log('💡 El sistema debería funcionar correctamente ahora.');
    } else {
      console.log('\n❌ ERROR: La suscripción no se actualizó correctamente.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar corrección
fixSubscriptionWithPayment(); 