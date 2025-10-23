#!/usr/bin/env node

/**
 * Script para corregir las estadísticas de franjas horarias
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTimeSlotStats() {
  try {
    console.log('🔧 Corrigiendo estadísticas de franjas horarias...');

    // Buscar un negocio existente
    const business = await prisma.business.findFirst({
      include: {
        branches: true
      }
    });

    if (!business) {
      console.error('❌ No se encontró ningún negocio');
      return;
    }

    const branch = business.branches[0];
    if (!branch) {
      console.error('❌ No se encontró ninguna sucursal');
      return;
    }

    console.log(`✅ Usando negocio: ${business.name}, sucursal: ${branch.name}`);

    // Eliminar estadísticas existentes
    await prisma.timeSlotStats.deleteMany({
      where: {
        businessId: business.id
      }
    });

    console.log('🗑️ Estadísticas anteriores eliminadas');

    // Crear estadísticas nuevas
    const stats = [
      {
        businessId: business.id,
        branchId: branch.id,
        dayOfWeek: 1, // Lunes
        hour: 9,
        totalAppointments: 20,
        cancelledCount: 8,
        noShowCount: 3,
        cancellationRate: 0.4,
        noShowRate: 0.15
      },
      {
        businessId: business.id,
        branchId: branch.id,
        dayOfWeek: 5, // Viernes
        hour: 18,
        totalAppointments: 15,
        cancelledCount: 6,
        noShowCount: 2,
        cancellationRate: 0.4,
        noShowRate: 0.13
      },
      {
        businessId: business.id,
        branchId: branch.id,
        dayOfWeek: 3, // Miércoles
        hour: 14,
        totalAppointments: 25,
        cancelledCount: 2,
        noShowCount: 1,
        cancellationRate: 0.08,
        noShowRate: 0.04
      }
    ];

    for (const stat of stats) {
      await prisma.timeSlotStats.create({
        data: stat
      });
      console.log(`✅ Estadística creada: Día ${stat.dayOfWeek}, Hora ${stat.hour}`);
    }

    // Verificar que se crearon
    const count = await prisma.timeSlotStats.count({
      where: { businessId: business.id }
    });

    console.log(`🎉 Estadísticas creadas: ${count} registros`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  fixTimeSlotStats()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

module.exports = { fixTimeSlotStats };
