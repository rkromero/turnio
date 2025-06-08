const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addWorkingHours() {
  try {
    console.log('🕒 Agregando horarios de trabajo realistas...');
    
    const professionalId = 'cmbkuw1gx0002ro0fjtao3m91';
    
    // Primero, eliminar horarios existentes
    await prisma.workingHours.deleteMany({
      where: { userId: professionalId }
    });
    
    // Agregar horarios de trabajo realistas
    const workingHours = [
      // Lunes (1)
      { 
        userId: professionalId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true
      },
      // Martes (2)
      { 
        userId: professionalId,
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true
      },
      // Miércoles (3)
      { 
        userId: professionalId,
        dayOfWeek: 3,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true
      },
      // Jueves (4)
      { 
        userId: professionalId,
        dayOfWeek: 4,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true
      },
      // Viernes (5)
      { 
        userId: professionalId,
        dayOfWeek: 5,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true
      },
      // Sábado (6) - horario reducido
      { 
        userId: professionalId,
        dayOfWeek: 6,
        startTime: '10:00',
        endTime: '15:00',
        isActive: true
      }
      // Domingo (0) - no trabaja
    ];
    
    for (const workingHour of workingHours) {
      await prisma.workingHours.create({
        data: workingHour
      });
      console.log(`✅ Agregado horario para día ${workingHour.dayOfWeek}: ${workingHour.startTime} - ${workingHour.endTime}`);
    }
    
    console.log('🎉 Horarios de trabajo agregados exitosamente!');
    
  } catch (error) {
    console.error('❌ Error agregando horarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addWorkingHours(); 