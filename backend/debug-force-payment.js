const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceApprovePaymentAndCheckSubscription() {
  try {
    // 1. Buscar la suscripción más reciente con status PAYMENT_FAILED
    const subscription = await prisma.subscription.findFirst({
      where: { status: 'PAYMENT_FAILED' },
      orderBy: { createdAt: 'desc' },
      include: { payments: { orderBy: { createdAt: 'desc' } } }
    });
    if (!subscription) {
      console.log('No hay suscripciones PAYMENT_FAILED para probar.');
      return;
    }
    const payment = subscription.payments[0];
    if (!payment) {
      console.log('No hay pagos asociados a la suscripción.');
      return;
    }
    // 2. Forzar el pago a APPROVED
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'APPROVED', paidAt: new Date() }
    });
    console.log('✅ Pago forzado a APPROVED:', payment.id);
    // 3. Esperar unos segundos para que el webhook procese (o simular el webhook si es necesario)
    await new Promise(r => setTimeout(r, 3000));
    // 4. Consultar el estado de la suscripción
    const updatedSubscription = await prisma.subscription.findUnique({ where: { id: subscription.id } });
    console.log('📋 Estado de la suscripción después de aprobar el pago:', updatedSubscription.status);
    if (updatedSubscription.status === 'ACTIVE') {
      console.log('✅ La suscripción pasó a ACTIVE correctamente.');
    } else {
      console.log('❌ La suscripción NO pasó a ACTIVE. Revisa la lógica del webhook.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceApprovePaymentAndCheckSubscription(); 