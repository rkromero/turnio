/**
 * Script para corregir el plan de un negocio después de un pago aprobado
 * Uso: node scripts/corregir-plan-pago.js [paymentId]
 * 
 * Este script:
 * 1. Busca el último pago aprobado (o el paymentId especificado)
 * 2. Verifica si el plan del negocio coincide con el de la suscripción
 * 3. Si no coincide, lo corrige automáticamente
 */

const { prisma } = require('../src/config/database');

// Límites de planes
const PLAN_LIMITS = {
  FREE: { appointments: 30 },
  BASIC: { appointments: 100 },
  PREMIUM: { appointments: 500 },
  ENTERPRISE: { appointments: 999999 }
};

async function corregirPlan(paymentId) {
  try {
    console.log('\n🔍 Buscando pago:', paymentId);
    
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

    console.log('\n📋 Estado Actual:');
    console.log('   Pago ID:', payment.id);
    console.log('   Pago Status:', payment.status);
    console.log('   Suscripción Plan:', payment.subscription.planType);
    console.log('   Suscripción Status:', payment.subscription.status);
    console.log('   Negocio Plan:', payment.subscription.business.planType);
    console.log('   Negocio Max Appointments:', payment.subscription.business.maxAppointments);

    // Solo corregir si el pago está aprobado
    if (payment.status !== 'APPROVED') {
      console.log('\n⚠️  El pago no está aprobado. Status:', payment.status);
      console.log('   No se puede corregir el plan hasta que el pago esté aprobado.');
      return;
    }

    // Verificar si hay discrepancia
    const subscriptionPlan = payment.subscription.planType;
    const businessPlan = payment.subscription.business.planType;

    if (subscriptionPlan === businessPlan && payment.subscription.status === 'ACTIVE') {
      console.log('\n✅ Todo está correcto. El plan ya está actualizado.');
      return;
    }

    console.log('\n🔧 CORRIGIENDO PLAN...');
    
    // Calcular próxima fecha de facturación
    const nextBillingDate = new Date();
    if (payment.subscription.billingCycle === 'MONTHLY') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // Actualizar suscripción
    await prisma.subscription.update({
      where: { id: payment.subscription.id },
      data: { 
        status: 'ACTIVE',
        nextBillingDate: nextBillingDate
      }
    });
    console.log('✅ Suscripción actualizada: ACTIVE');

    // Obtener límites del plan
    const planLimits = PLAN_LIMITS[subscriptionPlan] || PLAN_LIMITS.FREE;
    
    // Actualizar negocio
    await prisma.business.update({
      where: { id: payment.subscription.businessId },
      data: { 
        planType: subscriptionPlan,
        maxAppointments: planLimits.appointments === -1 ? 999999 : planLimits.appointments
      }
    });
    console.log('✅ Negocio actualizado:');
    console.log('   Plan Type:', subscriptionPlan);
    console.log('   Max Appointments:', planLimits.appointments);

    // Actualizar paidAt si no está
    if (!payment.paidAt) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { paidAt: new Date() }
      });
      console.log('✅ Payment.paidAt actualizado');
    }

    console.log('\n🎉 ¡Plan corregido exitosamente!');
    console.log('   El negocio ahora tiene el plan:', subscriptionPlan);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const paymentId = process.argv[2];
  
  if (paymentId) {
    await corregirPlan(paymentId);
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
      console.log('📋 Encontrado pago:', lastPayment.id);
      console.log('   Creado:', lastPayment.createdAt);
      console.log('   Monto:', lastPayment.amount);
      await corregirPlan(lastPayment.id);
    } else {
      console.log('❌ No se encontraron pagos aprobados');
      await prisma.$disconnect();
    }
  }
}

main().catch(console.error);

