/**
 * Script para verificar el estado de un pago y suscripción
 * Uso: node scripts/verificar-pago-suscripcion.js [paymentId]
 */

const { prisma } = require('../src/config/database');

async function verificarPago(paymentId) {
  try {
    console.log('\n🔍 Verificando pago:', paymentId);
    
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
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

    console.log('\n📋 Estado del Pago:');
    console.log('   ID:', payment.id);
    console.log('   Status:', payment.status);
    console.log('   Amount:', payment.amount);
    console.log('   Created:', payment.createdAt);
    console.log('   Paid At:', payment.paidAt);

    console.log('\n📋 Estado de la Suscripción:');
    console.log('   ID:', payment.subscription.id);
    console.log('   Plan Type:', payment.subscription.planType);
    console.log('   Status:', payment.subscription.status);
    console.log('   Billing Cycle:', payment.subscription.billingCycle);
    console.log('   Next Billing Date:', payment.subscription.nextBillingDate);

    console.log('\n📋 Estado del Negocio:');
    console.log('   ID:', payment.subscription.business.id);
    console.log('   Name:', payment.subscription.business.name);
    console.log('   Plan Type:', payment.subscription.business.planType);
    console.log('   Max Appointments:', payment.subscription.business.maxAppointments);

    // Verificar si hay discrepancia
    if (payment.status === 'APPROVED' && payment.subscription.business.planType !== payment.subscription.planType) {
      console.log('\n⚠️  PROBLEMA DETECTADO:');
      console.log('   El pago está aprobado pero el plan del negocio no coincide con el de la suscripción');
      console.log('   Plan de suscripción:', payment.subscription.planType);
      console.log('   Plan del negocio:', payment.subscription.business.planType);
      
      console.log('\n🔧 ¿Deseas corregir esto? (S/N)');
      // En producción, esto requeriría confirmación interactiva
      // Por ahora, solo mostramos la información
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener paymentId de argumentos o buscar el último pago aprobado
async function main() {
  const paymentId = process.argv[2];
  
  if (paymentId) {
    await verificarPago(paymentId);
  } else {
    // Buscar el último pago aprobado
    console.log('\n🔍 Buscando último pago aprobado...');
    const lastPayment = await prisma.payment.findFirst({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: {
            business: true
          }
        }
      }
    });

    if (lastPayment) {
      await verificarPago(lastPayment.id);
    } else {
      console.log('❌ No se encontraron pagos aprobados');
      await prisma.$disconnect();
    }
  }
}

main().catch(console.error);

