#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Índices críticos optimizados para Railway
const CRITICAL_INDEXES = [
  // 1. Índice MÁS CRÍTICO para consultas de disponibilidad
  {
    name: 'idx_appointments_business_branch_user_time',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_branch_user_time 
          ON appointments("businessId", "branchId", "userId", "startTime", status)`,
    description: 'Optimiza consultas de disponibilidad de turnos'
  },
  
  // 2. Índice para reportes por fecha
  {
    name: 'idx_appointments_business_date',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_date 
          ON appointments("businessId", "startTime")`,
    description: 'Optimiza reportes y dashboard por fecha'
  },
  
  // 3. Índice para búsquedas de clientes
  {
    name: 'idx_clients_business_email',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_email 
          ON clients("businessId", email) WHERE email IS NOT NULL`,
    description: 'Optimiza búsquedas de clientes por email'
  },
  
  // 4. Índice para búsquedas de clientes por teléfono
  {
    name: 'idx_clients_business_phone',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_phone 
          ON clients("businessId", phone) WHERE phone IS NOT NULL`,
    description: 'Optimiza búsquedas de clientes por teléfono'
  },
  
  // 5. Índice para reseñas públicas
  {
    name: 'idx_reviews_business_approved',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_business_approved 
          ON reviews("businessId", "isApproved", "createdAt" DESC) WHERE "isPublic" = true`,
    description: 'Optimiza consultas de reseñas públicas'
  }
];

async function checkExistingIndexes() {
  console.log('🔍 Verificando índices existentes...');
  
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
    
    console.log(`📋 Encontrados ${result.length} índices de performance:`);
    result.forEach(idx => {
      console.log(`   ✅ ${idx.indexname} en tabla ${idx.tablename}`);
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error verificando índices:', error.message);
    return [];
  }
}

async function applyCriticalIndexes() {
  console.log('🚀 Aplicando índices críticos de performance...');
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < CRITICAL_INDEXES.length; i++) {
    const index = CRITICAL_INDEXES[i];
    
    try {
      console.log(`\n⏳ Aplicando índice ${i + 1}/${CRITICAL_INDEXES.length}: ${index.name}`);
      console.log(`   📝 ${index.description}`);
      
      const startTime = Date.now();
      await prisma.$executeRawUnsafe(index.sql);
      const endTime = Date.now();
      
      const result = {
        index: index.name,
        status: 'success',
        timeMs: endTime - startTime,
        description: index.description
      };
      
      results.push(result);
      successCount++;
      
      console.log(`   ✅ Índice creado exitosamente (${result.timeMs}ms)`);
      
      // Pausa pequeña entre índices
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      const result = {
        index: index.name,
        status: 'error',
        error: error.message,
        description: index.description
      };
      
      results.push(result);
      errorCount++;
      
      if (error.message.includes('already exists')) {
        console.log(`   ⚠️  Índice ya existe (omitido)`);
        result.status = 'exists';
        successCount++;
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n📊 Resumen de aplicación de índices:');
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
  console.log(`   📋 Total: ${CRITICAL_INDEXES.length}`);
  
  return {
    results,
    summary: {
      total: CRITICAL_INDEXES.length,
      success: successCount,
      errors: errorCount
    }
  };
}

async function testQueryPerformance() {
  console.log('\n🧪 Probando performance de consultas críticas...');
  
  const tests = [
    {
      name: 'Consulta de disponibilidad',
      query: `SELECT COUNT(*) FROM appointments 
              WHERE "businessId" = (SELECT id FROM businesses LIMIT 1) 
              AND "startTime" >= NOW()`,
      expectedTime: 100 // ms
    },
    {
      name: 'Búsqueda de clientes',
      query: `SELECT COUNT(*) FROM clients 
              WHERE "businessId" = (SELECT id FROM businesses LIMIT 1) 
              AND email IS NOT NULL`,
      expectedTime: 50 // ms
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const startTime = Date.now();
      await prisma.$queryRawUnsafe(test.query);
      const endTime = Date.now();
      const actualTime = endTime - startTime;
      
      const result = {
        test: test.name,
        timeMs: actualTime,
        expectedMs: test.expectedTime,
        status: actualTime <= test.expectedTime ? 'good' : 'slow'
      };
      
      results.push(result);
      
      const status = result.status === 'good' ? '✅' : '⚠️';
      console.log(`   ${status} ${test.name}: ${actualTime}ms (esperado: ${test.expectedTime}ms)`);
      
    } catch (error) {
      console.log(`   ❌ ${test.name}: Error - ${error.message}`);
      results.push({
        test: test.name,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'apply';
  
  console.log('🚀 Optimizador de Performance TurnIO');
  console.log('=====================================\n');
  
  try {
    switch (command) {
      case 'check':
        await checkExistingIndexes();
        break;
        
      case 'apply':
        const existingIndexes = await checkExistingIndexes();
        console.log('\n' + '='.repeat(50) + '\n');
        
        const indexResults = await applyCriticalIndexes();
        console.log('\n' + '='.repeat(50) + '\n');
        
        const performanceResults = await testQueryPerformance();
        
        console.log('\n🎉 Optimización completada!');
        console.log('📊 Resumen final:');
        console.log(`   📋 Índices aplicados: ${indexResults.summary.success}/${indexResults.summary.total}`);
        console.log(`   🧪 Tests de performance: ${performanceResults.filter(r => r.status === 'good').length}/${performanceResults.length}`);
        
        break;
        
      case 'test':
        await testQueryPerformance();
        break;
        
      default:
        console.log('📖 Uso del script:');
        console.log('   node performance-optimizer.js check  - Verificar índices existentes');
        console.log('   node performance-optimizer.js apply  - Aplicar índices críticos');
        console.log('   node performance-optimizer.js test   - Probar performance');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = {
  checkExistingIndexes,
  applyCriticalIndexes,
  testQueryPerformance
};
