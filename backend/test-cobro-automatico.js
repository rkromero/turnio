const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function probarCobroAutomatico() {
  try {
    console.log('🚀 === PRUEBA DE COBRO AUTOMÁTICO ===\n');

    // 1. Buscar la suscripción más reciente que no sea FREE
    console.log('1️⃣ Buscando suscripción para prueba...');
    
    const subscription = await prisma.subscription.findFirst({
      where: {
        planType: { not: 'FREE' },
        status: 'ACTIVE'
      },
      include: {
        business: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      console.log('❌ No se encontró ninguna suscripción activa para probar');
      console.log('💡 Primero regístrate y crea una suscripción de pago en la aplicación');
      return;
    }

    console.log('✅ Suscripción encontrada:', {
      id: subscription.id.substring(0, 8) + '...',
      negocio: subscription.business.name,
      email: subscription.business.email,
      plan: subscription.planType,
      estado: subscription.status,
      fechaActualCobro: subscription.nextBillingDate?.toLocaleString('es-ES'),
      monto: `$${subscription.priceAmount}`,
      ciclo: subscription.billingCycle
    });

    // 2. Modificar la fecha para que sea ayer (vencida)
    console.log('\n2️⃣ Modificando fecha de próximo cobro...');
    
    const fechaVencida = new Date();
    fechaVencida.setDate(fechaVencida.getDate() - 1); // Ayer
    fechaVencida.setHours(12, 0, 0, 0); // A las 12:00 PM

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        nextBillingDate: fechaVencida
      }
    });

    console.log('✅ Fecha modificada a:', fechaVencida.toLocaleString('es-ES'));
    console.log('📅 La suscripción ahora aparece como VENCIDA');

    // 3. Importar y ejecutar el sistema de verificación
    console.log('\n3️⃣ Ejecutando verificación de suscripciones vencidas...');
    
    // Importar la función desde el controlador
    const { checkExpiredSubscriptions } = require('./src/controllers/subscriptionAutoController');
    
    console.log('🔍 Iniciando proceso de cobro automático...');
    await checkExpiredSubscriptions();

    // 4. Verificar el resultado
    console.log('\n4️⃣ Verificando resultado...');
    
    const subscriptionUpdated = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: {
        business: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 2
        }
      }
    });

    console.log('📊 Estado después del proceso:', {
      estado: subscriptionUpdated.status,
      fechaProximoCobro: subscriptionUpdated.nextBillingDate?.toLocaleString('es-ES'),
      totalPagos: subscriptionUpdated.payments.length,
      ultimoPago: subscriptionUpdated.payments[0] ? {
        fecha: subscriptionUpdated.payments[0].createdAt.toLocaleString('es-ES'),
        estado: subscriptionUpdated.payments[0].status,
        monto: `$${subscriptionUpdated.payments[0].amount}`
      } : 'No hay pagos'
    });

    // 5. Mostrar resultado
    console.log('\n🎯 RESULTADO DE LA PRUEBA:');
    
    if (subscriptionUpdated.status === 'ACTIVE' && subscriptionUpdated.nextBillingDate > new Date()) {
      console.log('✅ ¡ÉXITO! El cobro automático funcionó correctamente');
      console.log('💳 Se procesó el pago y se renovó la suscripción');
      console.log(`📅 Próximo cobro: ${subscriptionUpdated.nextBillingDate.toLocaleString('es-ES')}`);
    } else if (subscriptionUpdated.status === 'PAYMENT_FAILED') {
      console.log('⚠️ El cobro falló - se marcó como PAYMENT_FAILED');
      console.log('🔄 El sistema intentará cobrar nuevamente según la configuración');
    } else if (subscriptionUpdated.status === 'SUSPENDED') {
      console.log('⏸️ La suscripción fue suspendida por falta de pago');
      console.log('📧 Se debería enviar notificación al usuario');
    } else {
      console.log('❓ Estado inesperado:', subscriptionUpdated.status);
    }

  } catch (error) {
    console.error('❌ Error ejecutando prueba:', error.message);
    console.error('🔍 Detalles del error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Permitir diferentes modos de ejecución
const args = process.argv.slice(2);
const modo = args[0];

if (modo === 'buscar') {
  // Solo buscar y mostrar suscripciones
  buscarSuscripciones();
} else if (modo === 'restaurar') {
  // Restaurar fecha original
  restaurarFecha();
} else {
  // Ejecutar prueba completa
  probarCobroAutomatico();
}

async function buscarSuscripciones() {
  try {
    console.log('🔍 === BUSCANDO SUSCRIPCIONES ACTIVAS ===\n');
    
    const subscriptions = await prisma.subscription.findMany({
      where: {
        planType: { not: 'FREE' }
      },
      include: {
        business: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (subscriptions.length === 0) {
      console.log('❌ No hay suscripciones de pago en el sistema');
      return;
    }

    console.log(`📊 Encontradas ${subscriptions.length} suscripciones:`);
    
    subscriptions.forEach((sub, index) => {
      console.log(`\n${index + 1}. ${sub.business.name}`);
      console.log(`   📧 ${sub.business.email}`);
      console.log(`   💳 ${sub.planType} (${sub.billingCycle}) - $${sub.priceAmount}`);
      console.log(`   📊 Estado: ${sub.status}`);
      console.log(`   📅 Próximo cobro: ${sub.nextBillingDate?.toLocaleString('es-ES') || 'N/A'}`);
      console.log(`   🆔 ID: ${sub.id.substring(0, 8)}...`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function restaurarFecha() {
  try {
    console.log('🔄 === RESTAURANDO FECHAS DE COBRO ===\n');
    
    const subscription = await prisma.subscription.findFirst({
      where: {
        planType: { not: 'FREE' },
        status: { in: ['ACTIVE', 'PAYMENT_FAILED', 'SUSPENDED'] }
      },
      include: { business: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      console.log('❌ No se encontró suscripción para restaurar');
      return;
    }

    // Calcular nueva fecha (30 días desde hoy)
    const nuevaFecha = new Date();
    if (subscription.billingCycle === 'MONTHLY') {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
    } else {
      nuevaFecha.setFullYear(nuevaFecha.getFullYear() + 1);
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        nextBillingDate: nuevaFecha,
        status: 'ACTIVE'
      }
    });

    console.log('✅ Fecha restaurada:', {
      negocio: subscription.business.name,
      nuevaFecha: nuevaFecha.toLocaleString('es-ES'),
      estado: 'ACTIVE'
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
} 