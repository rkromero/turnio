const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicateClients() {
  try {
    console.log('🔍 Buscando clientes duplicados...');
    
    // Buscar todos los clientes agrupados por email
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    // Agrupar por email
    const emailGroups = {};
    clients.forEach(client => {
      if (client.email) {
        if (!emailGroups[client.email]) {
          emailGroups[client.email] = [];
        }
        emailGroups[client.email].push(client);
      }
    });
    
    // Encontrar duplicados
    const duplicates = Object.entries(emailGroups)
      .filter(([email, clients]) => clients.length > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No se encontraron clientes duplicados');
      return;
    }
    
    console.log(`📊 Encontrados ${duplicates.length} emails con duplicados:`);
    
    for (const [email, duplicateClients] of duplicates) {
      console.log(`\n📧 Email: ${email}`);
      console.log(`   Clientes duplicados: ${duplicateClients.length}`);
      
      // Ordenar por fecha de creación (el más antiguo primero)
      duplicateClients.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      const originalClient = duplicateClients[0]; // El más antiguo
      const duplicateClientsToDelete = duplicateClients.slice(1);
      
      console.log(`   ✅ Cliente original: ${originalClient.name} (ID: ${originalClient.id})`);
      
      for (const duplicate of duplicateClientsToDelete) {
        console.log(`   ❌ Cliente duplicado: ${duplicate.name} (ID: ${duplicate.id})`);
        
        // Verificar si el cliente duplicado tiene turnos
        const appointments = await prisma.appointment.findMany({
          where: { clientId: duplicate.id }
        });
        
        if (appointments.length > 0) {
          console.log(`   ⚠️  El cliente duplicado tiene ${appointments.length} turnos. Actualizando turnos...`);
          
          // Actualizar todos los turnos del cliente duplicado al cliente original
          await prisma.appointment.updateMany({
            where: { clientId: duplicate.id },
            data: { clientId: originalClient.id }
          });
          
          console.log(`   ✅ Turnos actualizados al cliente original`);
        }
        
        // Eliminar el cliente duplicado
        await prisma.client.delete({
          where: { id: duplicate.id }
        });
        
        console.log(`   ✅ Cliente duplicado eliminado`);
      }
    }
    
    console.log('\n🎉 Limpieza de duplicados completada');
    
  } catch (error) {
    console.error('❌ Error limpiando duplicados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanDuplicateClients();
}

module.exports = { cleanDuplicateClients };
