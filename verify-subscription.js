const { prisma } = require('./backend/src/config/database');

async function verifySubscription() {
  try {
    console.log('🔍 Verificando pago y suscripción...\n');

    // 1. Verificar el pago
    const payment = await prisma.payment.findUnique({
      where: { id: 'cmc3qg146000hp20i7qh7cse6' },
      include: {
        subscription: {
          include: {
            business: true
          }
        }
      }
    });

    if (!payment) {
      console.log('❌ Pago no encontrado');
      return;
    }

    console.log('💳 Información del pago:', {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      mercadoPagoOrderId: payment.mercadoPagoOrderId,
      createdAt: payment.createdAt
    });

    if (!payment.subscription) {
      console.log('❌ Suscripción no encontrada para este pago');
      return;
    }

    console.log('\n📊 Información de la suscripción:', {
      id: payment.subscription.id,
      planType: payment.subscription.planType,
      status: payment.subscription.status,
      mercadoPagoSubscriptionId: payment.subscription.mercadoPagoSubscriptionId,
      createdAt: payment.subscription.createdAt
    });

    console.log('\n🏢 Información del negocio:', {
      id: payment.subscription.business.id,
      name: payment.subscription.business.name,
      planType: payment.subscription.business.planType,
      createdAt: payment.subscription.business.createdAt
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
verifySubscription(); 