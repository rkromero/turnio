const { prisma } = require('../config/database');

// Índices críticos optimizados para Railway
const CRITICAL_INDEXES = [
  {
    name: 'idx_appointments_business_branch_user_time',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_branch_user_time 
          ON appointments("businessId", "branchId", "userId", "startTime", status)`,
    description: 'Optimiza consultas de disponibilidad de turnos'
  },
  {
    name: 'idx_appointments_business_date',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_date 
          ON appointments("businessId", "startTime")`,
    description: 'Optimiza reportes y dashboard por fecha'
  },
  {
    name: 'idx_clients_business_email',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_email 
          ON clients("businessId", email) WHERE email IS NOT NULL`,
    description: 'Optimiza búsquedas de clientes por email'
  },
  {
    name: 'idx_clients_business_phone',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_phone 
          ON clients("businessId", phone) WHERE phone IS NOT NULL`,
    description: 'Optimiza búsquedas de clientes por teléfono'
  },
  {
    name: 'idx_reviews_business_approved',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_business_approved 
          ON reviews("businessId", "isApproved", "createdAt" DESC) WHERE "isPublic" = true`,
    description: 'Optimiza consultas de reseñas públicas'
  }
];

// Verificar índices existentes
const checkExistingIndexes = async (req, res) => {
  try {
    console.log('🔍 Verificando índices existentes...');
    
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
    
    const indexSummary = result.map(idx => ({
      name: idx.indexname,
      table: idx.tablename,
      definition: idx.indexdef
    }));
    
    res.json({
      success: true,
      message: `Encontrados ${result.length} índices de performance`,
      data: {
        indexes: indexSummary,
        count: result.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error verificando índices:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando índices',
      error: error.message
    });
  }
};

// Aplicar índices críticos
const applyCriticalIndexes = async (req, res) => {
  try {
    console.log('🚀 Aplicando índices críticos de performance...');
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < CRITICAL_INDEXES.length; i++) {
      const index = CRITICAL_INDEXES[i];
      
      try {
        console.log(`⏳ Aplicando índice ${i + 1}/${CRITICAL_INDEXES.length}: ${index.name}`);
        
        const indexStartTime = Date.now();
        await prisma.$executeRawUnsafe(index.sql);
        const indexEndTime = Date.now();
        
        const result = {
          index: index.name,
          status: 'success',
          timeMs: indexEndTime - indexStartTime,
          description: index.description
        };
        
        results.push(result);
        successCount++;
        
        console.log(`✅ Índice creado: ${index.name} (${result.timeMs}ms)`);
        
        // Pausa pequeña entre índices
        await new Promise(resolve => setTimeout(resolve, 300));
        
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
          console.log(`⚠️ Índice ya existe: ${index.name}`);
          result.status = 'exists';
          successCount++;
        } else {
          console.log(`❌ Error en ${index.name}: ${error.message}`);
        }
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log(`📊 Optimización completada en ${totalTime}ms`);
    console.log(`✅ Exitosos: ${successCount}, ❌ Errores: ${errorCount}`);
    
    res.json({
      success: true,
      message: 'Optimización de índices completada',
      data: {
        results,
        summary: {
          total: CRITICAL_INDEXES.length,
          success: successCount,
          errors: errorCount,
          totalTimeMs: totalTime
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error aplicando índices:', error);
    res.status(500).json({
      success: false,
      message: 'Error aplicando índices de performance',
      error: error.message
    });
  }
};

// Probar performance de consultas
const testQueryPerformance = async (req, res) => {
  try {
    console.log('🧪 Probando performance de consultas críticas...');
    
    const tests = [
      {
        name: 'Consulta de disponibilidad',
        query: `SELECT COUNT(*) FROM appointments 
                WHERE "businessId" = (SELECT id FROM businesses LIMIT 1) 
                AND "startTime" >= NOW() - INTERVAL '30 days'`,
        expectedTime: 100
      },
      {
        name: 'Búsqueda de clientes por email',
        query: `SELECT COUNT(*) FROM clients 
                WHERE "businessId" = (SELECT id FROM businesses LIMIT 1) 
                AND email IS NOT NULL`,
        expectedTime: 50
      },
      {
        name: 'Consulta de reseñas públicas',
        query: `SELECT COUNT(*) FROM reviews 
                WHERE "businessId" = (SELECT id FROM businesses LIMIT 1) 
                AND "isPublic" = true AND "isApproved" = true`,
        expectedTime: 50
      }
    ];
    
    const results = [];
    const startTime = Date.now();
    
    for (const test of tests) {
      try {
        const testStartTime = Date.now();
        await prisma.$queryRawUnsafe(test.query);
        const testEndTime = Date.now();
        const actualTime = testEndTime - testStartTime;
        
        const result = {
          test: test.name,
          timeMs: actualTime,
          expectedMs: test.expectedTime,
          status: actualTime <= test.expectedTime ? 'good' : 'slow',
          improvement: actualTime < test.expectedTime ? 'excellent' : 
                      actualTime <= test.expectedTime * 1.5 ? 'good' : 'needs_improvement'
        };
        
        results.push(result);
        
        const status = result.status === 'good' ? '✅' : '⚠️';
        console.log(`${status} ${test.name}: ${actualTime}ms (esperado: ${test.expectedTime}ms)`);
        
      } catch (error) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
        results.push({
          test: test.name,
          status: 'error',
          error: error.message
        });
      }
    }
    
    const totalTime = Date.now() - startTime;
    const goodTests = results.filter(r => r.status === 'good').length;
    
    console.log(`📊 Tests completados: ${goodTests}/${tests.length} exitosos en ${totalTime}ms`);
    
    res.json({
      success: true,
      message: `Performance tests completados: ${goodTests}/${tests.length} exitosos`,
      data: {
        results,
        summary: {
          total: tests.length,
          passed: goodTests,
          failed: results.length - goodTests,
          totalTimeMs: totalTime
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error en tests de performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando tests de performance',
      error: error.message
    });
  }
};

// Optimización completa (índices + tests)
const fullOptimization = async (req, res) => {
  try {
    console.log('🚀 Iniciando optimización completa de performance...');
    
    const optimizationResults = {
      indexes: null,
      performance: null,
      summary: {
        startTime: new Date().toISOString(),
        totalTimeMs: 0
      }
    };
    
    const startTime = Date.now();
    
    // 1. Verificar índices existentes
    console.log('📋 Paso 1: Verificando índices existentes...');
    const existingIndexes = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%'
    `;
    
    // 2. Aplicar índices críticos
    console.log('📋 Paso 2: Aplicando índices críticos...');
    const indexResults = [];
    let successCount = 0;
    
    for (const index of CRITICAL_INDEXES) {
      try {
        await prisma.$executeRawUnsafe(index.sql);
        indexResults.push({
          index: index.name,
          status: 'success',
          description: index.description
        });
        successCount++;
        console.log(`✅ Índice aplicado: ${index.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          indexResults.push({
            index: index.name,
            status: 'exists',
            description: index.description
          });
          successCount++;
          console.log(`⚠️ Índice ya existe: ${index.name}`);
        } else {
          indexResults.push({
            index: index.name,
            status: 'error',
            error: error.message,
            description: index.description
          });
          console.log(`❌ Error en ${index.name}: ${error.message}`);
        }
      }
      
      // Pausa entre índices
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    optimizationResults.indexes = {
      results: indexResults,
      summary: {
        total: CRITICAL_INDEXES.length,
        success: successCount,
        errors: CRITICAL_INDEXES.length - successCount
      }
    };
    
    // 3. Probar performance
    console.log('📋 Paso 3: Probando performance...');
    const performanceResults = [];
    const tests = [
      {
        name: 'Consulta de disponibilidad',
        query: `SELECT COUNT(*) FROM appointments WHERE "startTime" >= NOW() - INTERVAL '30 days'`,
        expectedTime: 100
      },
      {
        name: 'Búsqueda de clientes',
        query: `SELECT COUNT(*) FROM clients WHERE email IS NOT NULL`,
        expectedTime: 50
      }
    ];
    
    for (const test of tests) {
      try {
        const testStart = Date.now();
        await prisma.$queryRawUnsafe(test.query);
        const testTime = Date.now() - testStart;
        
        performanceResults.push({
          test: test.name,
          timeMs: testTime,
          expectedMs: test.expectedTime,
          status: testTime <= test.expectedTime ? 'good' : 'slow'
        });
        
        console.log(`✅ ${test.name}: ${testTime}ms`);
      } catch (error) {
        performanceResults.push({
          test: test.name,
          status: 'error',
          error: error.message
        });
        console.log(`❌ ${test.name}: Error`);
      }
    }
    
    optimizationResults.performance = {
      results: performanceResults,
      summary: {
        total: tests.length,
        passed: performanceResults.filter(r => r.status === 'good').length
      }
    };
    
    optimizationResults.summary.totalTimeMs = Date.now() - startTime;
    optimizationResults.summary.endTime = new Date().toISOString();
    
    console.log(`🎉 Optimización completa finalizada en ${optimizationResults.summary.totalTimeMs}ms`);
    
    res.json({
      success: true,
      message: 'Optimización completa de performance ejecutada exitosamente',
      data: optimizationResults
    });
    
  } catch (error) {
    console.error('❌ Error en optimización completa:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando optimización completa',
      error: error.message
    });
  }
};

module.exports = {
  checkExistingIndexes,
  applyCriticalIndexes,
  testQueryPerformance,
  fullOptimization
};
