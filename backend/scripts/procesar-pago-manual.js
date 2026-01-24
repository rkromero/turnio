/**
 * Script para procesar manualmente un pago de MercadoPago (útil cuando el webhook no llega en sandbox)
 * Uso: node scripts/procesar-pago-manual.js [mpPaymentId]
 * 
 * Este script:
 * 1. Busca el pago en MercadoPago por ID
 * 2. Verifica su estado
 * 3. Si está aprobado, actualiza la suscripción y el plan del negocio
 */

const { MercadoPagoConfig, Payment } = require('mercadopago');
const { prisma } = require('../src/config/database');

// Límites de planes
const PLAN_LIMITS = {
  FREE: { appointments: 30 },
  BASIC: { appointments: 100 },
  PREMIUM: { appointments: 500 },
  ENTERPRISE: { appointments: 999999 }
};

async function procesarPagoManual(mpPaymentId) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.log('❌ MERCADOPAGO_ACCESS_TOKEN no está configurado');
      return;
    }

    console.log('\n🔍 Buscando pago en MercadoPago:', mpPaymentId);
    console.log('   Modo:', accessToken.startsWith('TEST-') ? 'SANDBOX' : 'PRODUCCIÓN');
    
    // Crear cliente de MercadoPago
    const client = new MercadoPagoConfig({ accessToken });
    const paymentClient = new Payment(client);
    
    // Obtener información del pago desde MercadoPago
    const paymentData = await paymentClient.get({ id: mpPaymentId });
    
    console.log('\n📋 Información del Pago en MercadoPago:');
    console.log('   ID:', paymentData.id);
    console.log('   Status:', paymentData.status);
    console.log('   External Reference:', paymentData.external_reference);
    console.log('   Live Mode:', paymentData.live_mode);
    console.log('   Amount:', paymentData.transaction_amount);
    console.log('   Date Created:', paymentData.date_created);

    if (!paymentData.external_reference) {
      console.log('\n❌ El pago no tiene external_reference. No se puede procesar.');
      return;
    }

    // Buscar nuestro pago interno
    const payment = await prisma.payment.findUnique({
      where: { id: paymentData.external_reference },
      include: {
        subscription: {
          include: {
            business: true
          }
        }
      }
    });

    if (!payment) {
      console.log('\n❌ Pago no encontrado en nuestra base de datos con ID:', paymentData.external_reference);
      return;
    }

    console.log('\n📋 Estado Actual en Base de Datos:');
    console.log('   Pago ID:', payment.id);
    console.log('   Pago Status:', payment.status);
    console.log('   Suscripción Plan:', payment.subscription.planType);
    console.log('   Suscripción Status:', payment.subscription.status);
    console.log('   Negocio Plan:', payment.subscription.business.planType);

    // Mapear estados de MercadoPago
    let newStatus = 'PENDING';
    switch (paymentData.status) {
      case 'approved':
        newStatus = 'APPROVED';
        break;
      case 'rejected':
      case 'cancelled':
        newStatus = 'REJECTED';
        break;
      default:
        newStatus = 'PENDING';
    }

    console.log('\n🔧 PROCESANDO PAGO...');
    
    // Actualizar pago
    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: newStatus,
        mercadoPagoPaymentId: paymentData.id.toString(),
        paidAt: newStatus === 'APPROVED' ? new Date() : null
      }
    });
    console.log('✅ Pago actualizado:', newStatus);

    // Si el pago fue aprobado, actualizar suscripción y negocio
    if (newStatus === 'APPROVED') {
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
      const planLimits = PLAN_LIMITS[payment.subscription.planType] || PLAN_LIMITS.FREE;
      
      // Actualizar negocio
      await prisma.business.update({
        where: { id: payment.subscription.businessId },
        data: { 
          planType: payment.subscription.planType,
          maxAppointments: planLimits.appointments === -1 ? 999999 : planLimits.appointments
        }
      });
      console.log('✅ Negocio actualizado:');
      console.log('   Plan Type:', payment.subscription.planType);
      console.log('   Max Appointments:', planLimits.appointments);

      console.log('\n🎉 ¡Pago procesado exitosamente!');
    } else {
      console.log('\n⚠️  El pago no está aprobado. Status:', newStatus);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.status === 404) {
      console.error('   El pago no existe en MercadoPago (puede ser un ID de prueba)');
    }
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const mpPaymentId = process.argv[2];
  
  if (!mpPaymentId) {
    console.log('\n❌ Debes proporcionar el ID del pago de MercadoPago');
    console.log('   Uso: node scripts/procesar-pago-manual.js [mpPaymentId]');
    console.log('\n   Para encontrar el ID del pago:');
    console.log('   1. Ve al panel de MercadoPago');
    console.log('   2. Ve a "Pagos"');
    console.log('   3. Busca el pago que hiciste');
    console.log('   4. Copia el ID del pago');
    await prisma.$disconnect();
    return;
  }

  await procesarPagoManual(mpPaymentId);
}

main().catch(console.error);

