const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const prisma = new PrismaClient();

// Configurar MercadoPago
const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

async function debugSubscriptionStatus() {
  try {
    console.log('🔍 === DEBUGGING SUSCRIPCIÓN Y PAGOS ===\n');

    // Buscar la suscripción más reciente
    const subscription = await prisma.subscription.findFirst({
      where: {
        planType: 'BASIC',
        status: 'PAYMENT_FAILED'
      },
      include: {
        business: true,
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!subscription) {
      console.log('❌ No se encontró suscripción con status PAYMENT_FAILED');
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
      mercadoPagoSubscriptionId: subscription.mercadoPagoSubscriptionId,
      startDate: subscription.startDate,
      nextBillingDate: subscription.nextBillingDate
    });

    console.log('\n💳 PAGOS ASOCIADOS:');
    subscription.payments.forEach(payment => {
      console.log({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        mercadoPagoPaymentId: payment.mercadoPagoPaymentId,
        mercadoPagoOrderId: payment.mercadoPagoOrderId,
        preferenceId: payment.preferenceId,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt
      });
    });

    // Si hay un payment con MercadoPago ID, verificar su estado
    const paymentWithMP = subscription.payments.find(p => p.mercadoPagoPaymentId);
    if (paymentWithMP) {
      console.log('\n🔍 VERIFICANDO ESTADO EN MERCADOPAGO...');
      try {
        const paymentClient = new Payment(mpClient);
        const mpPayment = await paymentClient.get({ id: paymentWithMP.mercadoPagoPaymentId });
        
        console.log('📊 Estado en MercadoPago:', {
          id: mpPayment.id,
          status: mpPayment.status,
          external_reference: mpPayment.external_reference,
          transaction_amount: mpPayment.transaction_amount,
          date_created: mpPayment.date_created,
          date_approved: mpPayment.date_approved
        });

        // Si el pago está aprobado en MP pero no en nuestra BD, actualizar
        if (mpPayment.status === 'approved' && paymentWithMP.status !== 'APPROVED') {
          console.log('\n🔄 ACTUALIZANDO ESTADO DEL PAGO...');
          
          await prisma.payment.update({
            where: { id: paymentWithMP.id },
            data: { 
              status: 'APPROVED',
              paidAt: new Date()
            }
          });

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { 
              status: 'ACTIVE',
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 días
            }
          });

          console.log('✅ Estado actualizado correctamente');
        }
      } catch (error) {
        console.log('❌ Error verificando pago en MercadoPago:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar debug
debugSubscriptionStatus(); 