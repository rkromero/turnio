#!/usr/bin/env node

/**
 * Script para verificar si existen datos de predicción de riesgo
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRiskData() {
  try {
    console.log('🔍 Verificando datos de predicción de riesgo...\n');

    // 1. Verificar si hay citas
    const appointmentsCount = await prisma.appointment.count();
    console.log(`📅 Total de citas: ${appointmentsCount}`);

    // 2. Verificar si hay predicciones de riesgo
    const predictionsCount = await prisma.appointmentRiskPrediction.count();
    console.log(`🔮 Total de predicciones: ${predictionsCount}`);

    // 3. Verificar si hay clientes con scoring
    const clientScoresCount = await prisma.clientScore.count();
    console.log(`👥 Total de clientes con scoring: ${clientScoresCount}`);

    // 4. Verificar si hay estadísticas de franjas horarias
    const timeSlotStatsCount = await prisma.timeSlotStat.count();
    console.log(`⏰ Total de estadísticas de franjas: ${timeSlotStatsCount}`);

    // 5. Verificar si hay servicios con datos de riesgo
    const servicesWithRiskData = await prisma.service.count({
      where: {
        OR: [
          { cancellationRate: { not: null } },
          { noShowRate: { not: null } },
          { totalAppointments: { gt: 0 } }
        ]
      }
    });
    console.log(`🛠️ Servicios con datos de riesgo: ${servicesWithRiskData}`);

    // 6. Mostrar algunas predicciones de ejemplo
    if (predictionsCount > 0) {
      console.log('\n📊 Ejemplos de predicciones:');
      const samplePredictions = await prisma.appointmentRiskPrediction.findMany({
        take: 3,
        include: {
          appointment: {
            include: {
              client: { select: { name: true, email: true } },
              service: { select: { name: true } }
            }
          }
        }
      });

      samplePredictions.forEach((pred, index) => {
        console.log(`  ${index + 1}. Cliente: ${pred.appointment.client.name}`);
        console.log(`     Servicio: ${pred.appointment.service.name}`);
        console.log(`     Riesgo: ${pred.riskLevel} (${pred.riskScore}%)`);
        console.log(`     Fecha: ${pred.appointment.startTime}`);
        console.log('');
      });
    }

    // 7. Verificar si hay citas futuras sin predicción
    const futureAppointments = await prisma.appointment.count({
      where: {
        status: 'CONFIRMED',
        startTime: { gte: new Date() }
      }
    });

    const futureAppointmentsWithPrediction = await prisma.appointment.count({
      where: {
        status: 'CONFIRMED',
        startTime: { gte: new Date() },
        riskPrediction: { isNot: null }
      }
    });

    console.log(`📈 Citas futuras: ${futureAppointments}`);
    console.log(`🔮 Citas futuras con predicción: ${futureAppointmentsWithPrediction}`);

    if (futureAppointments > 0 && futureAppointmentsWithPrediction === 0) {
      console.log('\n⚠️  PROBLEMA: Hay citas futuras pero ninguna tiene predicción de riesgo');
      console.log('💡 Solución: Ejecutar el script de datos de prueba o calcular predicciones');
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  checkRiskData()
    .then(() => {
      console.log('🎉 Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

module.exports = { checkRiskData };
