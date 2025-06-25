const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createFreeSubscriptionsForExistingUsers() {
  try {
    console.log('🔧 Iniciando migración: Crear suscripciones FREE para usuarios existentes...');

    // Buscar todos los negocios que no tienen suscripción
    const businessesWithoutSubscription = await prisma.business.findMany({
      where: {
        subscription: null
      },
      include: {
        subscription: true
      }
    });

    console.log(`📊 Encontrados ${businessesWithoutSubscription.length} negocios sin suscripción`);

    if (businessesWithoutSubscription.length === 0) {
      console.log('✅ Todos los negocios ya tienen suscripción. No se requiere migración.');
      return;
    }

    // Crear suscripciones FREE para cada negocio
    const results = [];
    
    for (const business of businessesWithoutSubscription) {
      try {
        console.log(`🔄 Procesando negocio: ${business.name} (${business.email})`);
        
        const subscription = await prisma.subscription.create({
          data: {
            businessId: business.id,
            planType: business.planType || 'FREE', // Usar el plan actual del negocio
            status: 'ACTIVE',
            startDate: business.createdAt || new Date(), // Usar fecha de creación del negocio
            nextBillingDate: null, // Plan FREE no tiene fecha de vencimiento
            priceAmount: 0,
            billingCycle: 'MONTHLY',
            autoRenew: false,
            metadata: {
              migratedAt: new Date().toISOString(),
              migrationType: 'free_subscription_creation',
              originalPlanType: business.planType
            }
          }
        });

        // Actualizar el negocio para asegurar que tenga planType FREE si no lo tenía
        if (!business.planType || business.planType !== 'FREE') {
          await prisma.business.update({
            where: { id: business.id },
            data: {
              planType: 'FREE'
            }
          });
        }

        results.push({
          businessId: business.id,
          businessName: business.name,
          subscriptionId: subscription.id,
          status: 'SUCCESS'
        });

        console.log(`✅ Suscripción FREE creada para: ${business.name}`);
        
      } catch (error) {
        console.error(`❌ Error procesando negocio ${business.name}:`, error);
        results.push({
          businessId: business.id,
          businessName: business.name,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    // Resumen de resultados
    const successful = results.filter(r => r.status === 'SUCCESS');
    const failed = results.filter(r => r.status === 'ERROR');

    console.log('\n🎉 MIGRACIÓN COMPLETADA');
    console.log(`✅ Suscripciones creadas exitosamente: ${successful.length}`);
    console.log(`❌ Errores: ${failed.length}`);

    if (successful.length > 0) {
      console.log('\n✅ NEGOCIOS MIGRADOS EXITOSAMENTE:');
      successful.forEach(result => {
        console.log(`  - ${result.businessName} (ID: ${result.businessId})`);
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ ERRORES EN MIGRACIÓN:');
      failed.forEach(result => {
        console.log(`  - ${result.businessName}: ${result.error}`);
      });
    }

    // Verificar que todos los negocios ahora tengan suscripción
    const remainingWithoutSubscription = await prisma.business.count({
      where: {
        subscription: null
      }
    });

    if (remainingWithoutSubscription === 0) {
      console.log('\n🎯 MIGRACIÓN EXITOSA: Todos los negocios ahora tienen suscripción');
    } else {
      console.log(`\n⚠️ ADVERTENCIA: ${remainingWithoutSubscription} negocios aún sin suscripción`);
    }

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Función para verificar el estado actual
async function checkSubscriptionStatus() {
  try {
    console.log('📊 VERIFICANDO ESTADO ACTUAL DE SUSCRIPCIONES...\n');

    const totalBusinesses = await prisma.business.count();
    const businessesWithSubscription = await prisma.business.count({
      where: {
        subscription: {
          isNot: null
        }
      }
    });
    const businessesWithoutSubscription = totalBusinesses - businessesWithSubscription;

    console.log(`📈 Total de negocios: ${totalBusinesses}`);
    console.log(`✅ Con suscripción: ${businessesWithSubscription}`);
    console.log(`❌ Sin suscripción: ${businessesWithoutSubscription}`);

    // Mostrar distribución por tipo de plan
    const planDistribution = await prisma.subscription.groupBy({
      by: ['planType'],
      _count: {
        planType: true
      }
    });

    console.log('\n📊 DISTRIBUCIÓN POR TIPO DE PLAN:');
    planDistribution.forEach(plan => {
      console.log(`  ${plan.planType}: ${plan._count.planType} suscripciones`);
    });

    return {
      total: totalBusinesses,
      withSubscription: businessesWithSubscription,
      withoutSubscription: businessesWithoutSubscription,
      needsMigration: businessesWithoutSubscription > 0
    };

  } catch (error) {
    console.error('❌ Error verificando estado:', error);
  }
}

// Ejecutar según el parámetro
async function main() {
  const action = process.argv[2];

  if (action === 'check') {
    await checkSubscriptionStatus();
  } else if (action === 'migrate') {
    const status = await checkSubscriptionStatus();
    if (status.needsMigration) {
      console.log('\n🚀 INICIANDO MIGRACIÓN...\n');
      await createFreeSubscriptionsForExistingUsers();
    } else {
      console.log('\n✅ No se requiere migración');
    }
  } else {
    console.log(`
🔧 MIGRACIÓN DE SUSCRIPCIONES FREE

Uso:
  node create-free-subscriptions-migration.js check   - Verificar estado actual
  node create-free-subscriptions-migration.js migrate - Ejecutar migración

Descripción:
  Este script crea suscripciones FREE para todos los negocios que no tienen
  suscripción, resolviendo los errores 403 en el sistema.
    `);
  }
}

main().catch(console.error); 