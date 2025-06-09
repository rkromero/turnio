require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetCompleteDatabase() {
  console.log('🗑️ INICIANDO RESET COMPLETO DE LA BASE DE DATOS...');
  console.log('⚠️ ESTO ELIMINARÁ TODOS LOS DATOS PERMANENTEMENTE');
  
  try {
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');

    // Comandos SQL para eliminar todos los datos
    const deleteCommands = [
      'DELETE FROM client_history',
      'DELETE FROM client_scores', 
      'DELETE FROM reviews',
      'DELETE FROM appointments',
      'DELETE FROM working_hours',
      'DELETE FROM branch_holidays',
      'DELETE FROM branch_services',
      'DELETE FROM branches',
      'DELETE FROM users',
      'DELETE FROM holidays',
      'DELETE FROM services',
      'DELETE FROM clients',
      'DELETE FROM businesses'
    ];

    console.log('🔄 Ejecutando comandos de limpieza...');
    
    for (let i = 0; i < deleteCommands.length; i++) {
      const command = deleteCommands[i];
      try {
        console.log(`Ejecutando: ${command}`);
        const result = await prisma.$executeRawUnsafe(command);
        console.log(`✅ ${command} - Ejecutado exitosamente`);
      } catch (error) {
        console.log(`⚠️ ${command} - ${error.message}`);
      }
    }

    // Verificar que todo esté limpio
    console.log('\n🔍 Verificando que todo esté limpio...');
    
    const verification = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM users) as usuarios,
        (SELECT COUNT(*) FROM businesses) as negocios,
        (SELECT COUNT(*) FROM branches) as sucursales,
        (SELECT COUNT(*) FROM clients) as clientes,
        (SELECT COUNT(*) FROM appointments) as citas
    `;
    
    console.log('📊 Estado final:', verification[0]);
    
    const counts = verification[0];
    if (counts.usuarios == 0 && counts.negocios == 0 && counts.sucursales == 0 && counts.clientes == 0 && counts.citas == 0) {
      console.log('🎉 RESET COMPLETO EXITOSO - Base de datos completamente limpia');
    } else {
      console.log('⚠️ Algunos datos pueden no haberse eliminado completamente');
    }

  } catch (error) {
    console.error('❌ Error durante el reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('✅ Desconectado de la base de datos');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  resetCompleteDatabase()
    .then(() => {
      console.log('🎯 Reset completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { resetCompleteDatabase }; 