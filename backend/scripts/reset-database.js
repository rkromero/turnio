const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🗑️  Iniciando limpieza de base de datos...');
    
    // Borrar datos en orden correcto (respetando foreign keys)
    console.log('Borrando appointments...');
    await prisma.appointment.deleteMany({});
    
    console.log('Borrando reviews...');
    await prisma.review.deleteMany({});
    
    console.log('Borrando client scores...');
    await prisma.clientScore.deleteMany({});
    
    console.log('Borrando client events...');
    await prisma.clientEvent.deleteMany({});
    
    console.log('Borrando clients...');
    await prisma.client.deleteMany({});
    
    console.log('Borrando service branch assignments...');
    await prisma.serviceBranch.deleteMany({});
    
    console.log('Borrando services...');
    await prisma.service.deleteMany({});
    
    console.log('Borrando working hours...');
    await prisma.workingHours.deleteMany({});
    
    console.log('Borrando break times...');
    await prisma.breakTime.deleteMany({});
    
    console.log('Borrando branches...');
    await prisma.branch.deleteMany({});
    
    console.log('Borrando users...');
    await prisma.user.deleteMany({});
    
    console.log('Borrando subscriptions...');
    await prisma.subscription.deleteMany({});
    
    console.log('Borrando businesses...');
    await prisma.business.deleteMany({});
    
    console.log('✅ Base de datos limpiada exitosamente!');
    console.log('🎉 Ahora puedes registrarte como nuevo usuario');
    
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase(); 