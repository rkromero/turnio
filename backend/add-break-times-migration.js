const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateBreakTimes() {
  try {
    console.log('🚀 Iniciando migración de horarios de descanso...');

    // Verificar si la tabla ya existe
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'branch_break_times'
      );
    `;

    if (tableExists[0].exists) {
      console.log('✅ La tabla branch_break_times ya existe. No es necesario migrar.');
      return;
    }

    // Crear la tabla de horarios de descanso
    await prisma.$executeRaw`
      CREATE TABLE "branch_break_times" (
        "id" TEXT NOT NULL,
        "branchId" TEXT NOT NULL,
        "dayOfWeek" INTEGER NOT NULL,
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        "name" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "branch_break_times_pkey" PRIMARY KEY ("id")
      );
    `;

    // Crear índices y constraints
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "branch_break_times_branchId_dayOfWeek_startTime_key" 
      ON "branch_break_times"("branchId", "dayOfWeek", "startTime");
    `;

    await prisma.$executeRaw`
      ALTER TABLE "branch_break_times" 
      ADD CONSTRAINT "branch_break_times_branchId_fkey" 
      FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;

    console.log('✅ Tabla branch_break_times creada exitosamente');

    // Agregar horarios de descanso de ejemplo (solo si hay sucursales)
    const branchCount = await prisma.branch.count();
    
    if (branchCount > 0) {
      const sampleBranches = await prisma.branch.findMany({
        take: 3,
        select: { id: true, name: true }
      });

      for (const branch of sampleBranches) {
        // Agregar horario de almuerzo de lunes a viernes (12:00-13:00)
        for (let day = 1; day <= 5; day++) { // Lunes a Viernes
          await prisma.branchBreakTime.create({
            data: {
              branchId: branch.id,
              dayOfWeek: day,
              startTime: '12:00',
              endTime: '13:00',
              name: 'Almuerzo',
              isActive: true
            }
          });
        }
        console.log(`📍 Horarios de almuerzo agregados para ${branch.name}`);
      }
    }

    console.log('✅ Migración de horarios de descanso completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración de horarios de descanso:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  migrateBreakTimes()
    .then(() => {
      console.log('🎉 Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

module.exports = { migrateBreakTimes }; 