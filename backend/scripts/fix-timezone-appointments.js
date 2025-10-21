/**
 * Script de Migración: Corregir Timezone de Turnos
 * 
 * Problema: Los turnos fueron guardados CON ajuste de +3 horas (incorrecto)
 * Solución: Restar 3 horas a startTime y endTime de TODOS los turnos
 * 
 * IMPORTANTE: Ejecutar UNA SOLA VEZ después de hacer deploy del fix de timezone
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTimezoneAppointments() {
  console.log('🔧 Iniciando migración de timezone para turnos...\n');

  try {
    // 1. Obtener todos los turnos
    const appointments = await prisma.appointment.findMany({
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log(`📊 Total de turnos encontrados: ${appointments.length}\n`);

    if (appointments.length === 0) {
      console.log('✅ No hay turnos para migrar');
      return;
    }

    let updated = 0;
    let errors = 0;

    // 2. Ajustar cada turno RESTANDO 3 horas (corregir el offset aplicado incorrectamente)
    for (const appointment of appointments) {
      try {
        const originalStartTime = new Date(appointment.startTime);
        const originalEndTime = new Date(appointment.endTime);

        // Restar 3 horas (corregir el offset que se aplicó de más)
        const newStartTime = new Date(originalStartTime.getTime() - 3 * 60 * 60 * 1000);
        const newEndTime = new Date(originalEndTime.getTime() - 3 * 60 * 60 * 1000);

        // Actualizar en base de datos
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            startTime: newStartTime,
            endTime: newEndTime
          }
        });

        updated++;
        
        // Log de progreso cada 10 turnos
        if (updated % 10 === 0) {
          console.log(`   ✅ ${updated}/${appointments.length} turnos actualizados...`);
        }

      } catch (error) {
        errors++;
        console.error(`   ❌ Error actualizando turno ${appointment.id}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN:');
    console.log('='.repeat(60));
    console.log(`✅ Turnos actualizados exitosamente: ${updated}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📋 Total procesados: ${appointments.length}`);
    console.log('='.repeat(60));

    if (errors === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
      console.log('📝 Todos los turnos ahora tienen la hora correcta (se corrigieron las 3h de más)');
    } else {
      console.log(`\n⚠️ Migración completada con ${errors} errores`);
    }

  } catch (error) {
    console.error('\n❌ Error fatal durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
fixTimezoneAppointments()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });

