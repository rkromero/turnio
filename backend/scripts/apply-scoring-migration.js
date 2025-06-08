const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyScoringMigration() {
  console.log('🔄 Aplicando migración del sistema de scoring...');
  
  try {
    // Leer el script SQL
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'add-scoring-tables.sql'), 
      'utf8'
    );
    
    // Dividir en comandos individuales
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Ejecutando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`   ${i + 1}/${commands.length}: ${command.substring(0, 50)}...`);
      
      try {
        await prisma.$executeRawUnsafe(command);
        console.log(`   ✅ Comando ${i + 1} ejecutado exitosamente`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️ Comando ${i + 1} omitido (ya existe)`);
        } else {
          console.error(`   ❌ Error en comando ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('✅ Migración del sistema de scoring aplicada exitosamente');
    
    // Verificar que las tablas se crearon
    console.log('\n🔍 Verificando tablas creadas...');
    
    const clientScoresCount = await prisma.clientScore.count();
    console.log(`   📊 Tabla client_scores: ${clientScoresCount} registros`);
    
    const clientHistoryCount = await prisma.clientHistory.count();
    console.log(`   📋 Tabla client_history: ${clientHistoryCount} registros`);
    
    console.log('\n🎉 ¡Sistema de scoring listo para usar!');
    
  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  applyScoringMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { applyScoringMigration }; 