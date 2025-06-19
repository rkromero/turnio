const { prisma } = require('./backend/src/config/database');
require('dotenv').config();

async function checkSubscription() {
  try {
    console.log('🔍 Verificando suscripción...\n');

    // Buscar el usuario por email
    const user = await prisma.user.findFirst({
      where: {
        email: 'rodo2232323rrtrrlfor86@gmail.com'
      },
      include: {
        business: {
          include: {
            subscription: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:', {
      id: user.id,
      email: user.email,
      businessId: user.businessId
    });

    if (!user.business) {
      console.log('❌ Negocio no encontrado para este usuario');
      return;
    }

    console.log('\n📊 Información del negocio:', {
      id: user.business.id,
      name: user.business.name,
      createdAt: user.business.createdAt
    });

    if (!user.business.subscription) {
      console.log('❌ No hay suscripción activa para este negocio');
      return;
    }

    console.log('\n💳 Información de la suscripción:', {
      id: user.business.subscription.id,
      planType: user.business.subscription.planType,
      status: user.business.subscription.status,
      billingCycle: user.business.subscription.billingCycle,
      priceAmount: user.business.subscription.priceAmount,
      createdAt: user.business.subscription.createdAt,
      mercadoPagoSubscriptionId: user.business.subscription.mercadoPagoSubscriptionId
    });

    // Buscar pagos asociados
    const payments = await prisma.payment.findMany({
      where: {
        subscriptionId: user.business.subscription.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n💰 Historial de pagos:');
    payments.forEach(payment => {
      console.log({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        mercadoPagoOrderId: payment.mercadoPagoOrderId
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
checkSubscription(); 