const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyPerformanceIndexes() {
  console.log('🚀 Iniciando aplicación de índices de performance...');
  
  try {
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '../add-performance-indexes.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Dividir en comandos individuales
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'))
      .filter(cmd => cmd.startsWith('CREATE INDEX') || cmd.startsWith('SELECT'));
    
    console.log(`📋 Encontrados ${commands.length} comandos para ejecutar`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      try {
        console.log(`\n⏳ Ejecutando comando ${i + 1}/${commands.length}...`);
        
        if (command.startsWith('CREATE INDEX')) {
          console.log(`   📝 Creando índice: ${command.split('ON')[0].replace('CREATE INDEX CONCURRENTLY IF NOT EXISTS', '').trim()}`);
        } else if (command.startsWith('SELECT')) {
          console.log(`   🔍 Ejecutando consulta de verificación...`);
        }
        
        await prisma.$executeRawUnsafe(command);
        
        if (command.startsWith('CREATE INDEX')) {
          successCount++;
          console.log(`   ✅ Índice creado exitosamente`);
        } else if (command.startsWith('SELECT')) {
          console.log(`   ✅ Consulta ejecutada`);
        }
        
        // Pequeña pausa entre comandos para no sobrecargar la BD
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errorCount++;
        console.log(`   ❌ Error ejecutando comando:`);
        console.log(`      ${error.message}`);
        
        // Si es un error de índice ya existente, no es crítico
        if (error.message.includes('already exists')) {
          console.log(`      ⚠️  Índice ya existe, continuando...`);
          successCount++;
        }
      }
    }
    
    console.log('\n📊 Resumen de la ejecución:');
    console.log(`   ✅ Comandos exitosos: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📋 Total procesados: ${commands.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 ¡Todos los índices se aplicaron correctamente!');
    } else {
      console.log('\n⚠️  Algunos comandos fallaron. Revisar errores arriba.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Función para verificar el estado actual de índices
async function checkCurrentIndexes() {
  console.log('🔍 Verificando índices actuales...');
  
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `;
    
    console.log('\n📋 Índices de performance encontrados:');
    console.table(result);
    
    return result;
  } catch (error) {
    console.error('❌ Error verificando índices:', error);
    return [];
  }
}

// Función para monitorear uso de índices
async function monitorIndexUsage() {
  console.log('📊 Monitoreando uso de índices...');
  
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes 
      WHERE indexname LIKE 'idx_%'
      ORDER BY idx_scan DESC
    `;
    
    console.log('\n📈 Estadísticas de uso de índices:');
    console.table(result);
    
    return result;
  } catch (error) {
    console.error('❌ Error monitoreando índices:', error);
    return [];
  }
}

// Función para analizar queries lentas
async function analyzeSlowQueries() {
  console.log('🐌 Analizando queries lentas...');
  
  try {
    // Verificar si pg_stat_statements está habilitado
    const extensionCheck = await prisma.$queryRaw`
      SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements'
    `;
    
    if (extensionCheck.length === 0) {
      console.log('⚠️  Extensión pg_stat_statements no está habilitada');
      console.log('   Para habilitarla ejecuta: CREATE EXTENSION pg_stat_statements;');
      return;
    }
    
    const result = await prisma.$queryRaw`
      SELECT 
        query,
        mean_time,
        calls,
        total_time
      FROM pg_stat_statements 
      WHERE query LIKE '%appointments%' OR query LIKE '%clients%'
      ORDER BY mean_time DESC 
      LIMIT 10
    `;
    
    console.log('\n🐌 Top 10 queries más lentas:');
    console.table(result);
    
    return result;
  } catch (error) {
    console.error('❌ Error analizando queries:', error);
    return [];
  }
}

// Función principal con opciones
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'apply';
  
  switch (command) {
    case 'apply':
      await applyPerformanceIndexes();
      break;
    case 'check':
      await checkCurrentIndexes();
      break;
    case 'monitor':
      await monitorIndexUsage();
      break;
    case 'analyze':
      await analyzeSlowQueries();
      break;
    case 'all':
      console.log('🔄 Ejecutando todas las verificaciones...\n');
      await checkCurrentIndexes();
      console.log('\n' + '='.repeat(50) + '\n');
      await applyPerformanceIndexes();
      console.log('\n' + '='.repeat(50) + '\n');
      await monitorIndexUsage();
      console.log('\n' + '='.repeat(50) + '\n');
      await analyzeSlowQueries();
      break;
    default:
      console.log('📖 Uso del script:');
      console.log('   node apply-performance-indexes.js apply    - Aplicar índices');
      console.log('   node apply-performance-indexes.js check    - Verificar índices actuales');
      console.log('   node apply-performance-indexes.js monitor  - Monitorear uso de índices');
      console.log('   node apply-performance-indexes.js analyze  - Analizar queries lentas');
      console.log('   node apply-performance-indexes.js all      - Ejecutar todo');
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en el script:', error);
      process.exit(1);
    });
}

module.exports = {
  applyPerformanceIndexes,
  checkCurrentIndexes,
  monitorIndexUsage,
  analyzeSlowQueries
};
