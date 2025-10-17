const { prisma } = require('../config/database');

// Test de performance para consultas de disponibilidad
const testAvailabilityPerformance = async (req, res) => {
  try {
    console.log('🧪 Iniciando test de performance de disponibilidad...');
    
    // Obtener un negocio de prueba
    const business = await prisma.business.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, slug: true }
    });
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró ningún negocio para testing'
      });
    }
    
    const testResults = [];
    
    // Test 1: Consulta de disponibilidad básica
    const startTime1 = Date.now();
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: business.id,
        startTime: { gte: new Date() }
      },
      select: {
        startTime: true,
        endTime: true,
        userId: true,
        branchId: true,
        status: true
      },
      take: 100
    });
    const endTime1 = Date.now();
    
    testResults.push({
      test: 'Consulta de disponibilidad básica',
      timeMs: endTime1 - startTime1,
      recordsFound: appointments.length,
      expectedTime: 50,
      status: (endTime1 - startTime1) <= 50 ? 'good' : 'slow'
    });
    
    // Test 2: Consulta con índices compuestos
    const startTime2 = Date.now();
    const appointmentsWithIndex = await prisma.appointment.findMany({
      where: {
        businessId: business.id,
        branchId: { not: null },
        userId: { not: null },
        startTime: { gte: new Date() },
        status: { not: 'CANCELLED' }
      },
      select: {
        startTime: true,
        endTime: true,
        userId: true,
        branchId: true,
        status: true
      },
      take: 100
    });
    const endTime2 = Date.now();
    
    testResults.push({
      test: 'Consulta con índices compuestos',
      timeMs: endTime2 - startTime2,
      recordsFound: appointmentsWithIndex.length,
      expectedTime: 30,
      status: (endTime2 - startTime2) <= 30 ? 'good' : 'slow'
    });
    
    // Test 3: Búsqueda de clientes
    const startTime3 = Date.now();
    const clients = await prisma.client.findMany({
      where: {
        businessId: business.id,
        email: { not: null }
      },
      select: { id: true, name: true, email: true },
      take: 50
    });
    const endTime3 = Date.now();
    
    testResults.push({
      test: 'Búsqueda de clientes por email',
      timeMs: endTime3 - startTime3,
      recordsFound: clients.length,
      expectedTime: 25,
      status: (endTime3 - startTime3) <= 25 ? 'good' : 'slow'
    });
    
    // Test 4: Consulta de reseñas
    const startTime4 = Date.now();
    const reviews = await prisma.review.findMany({
      where: {
        businessId: business.id,
        isPublic: true,
        isApproved: true
      },
      select: { id: true, rating: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const endTime4 = Date.now();
    
    testResults.push({
      test: 'Consulta de reseñas públicas',
      timeMs: endTime4 - startTime4,
      recordsFound: reviews.length,
      expectedTime: 20,
      status: (endTime4 - startTime4) <= 20 ? 'good' : 'slow'
    });
    
    // Test 5: Consulta agregada para reportes
    const startTime5 = Date.now();
    const reportStats = await prisma.appointment.aggregate({
      where: {
        businessId: business.id,
        startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      _count: { id: true }
    });
    const endTime5 = Date.now();
    
    testResults.push({
      test: 'Consulta agregada para reportes',
      timeMs: endTime5 - startTime5,
      recordsFound: reportStats._count.id,
      expectedTime: 40,
      status: (endTime5 - startTime5) <= 40 ? 'good' : 'slow'
    });
    
    const totalTime = testResults.reduce((sum, test) => sum + test.timeMs, 0);
    const goodTests = testResults.filter(test => test.status === 'good').length;
    const averageTime = Math.round(totalTime / testResults.length);
    
    console.log(`📊 Tests completados: ${goodTests}/${testResults.length} exitosos en ${totalTime}ms promedio`);
    
    res.json({
      success: true,
      message: `Tests de performance completados: ${goodTests}/${testResults.length} exitosos`,
      data: {
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug
        },
        results: testResults,
        summary: {
          totalTests: testResults.length,
          passedTests: goodTests,
          failedTests: testResults.length - goodTests,
          totalTimeMs: totalTime,
          averageTimeMs: averageTime,
          performanceScore: Math.round((goodTests / testResults.length) * 100)
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

// Test de carga simulada
const testLoadPerformance = async (req, res) => {
  try {
    console.log('🚀 Iniciando test de carga...');
    
    const { concurrentRequests = 10, iterations = 5 } = req.query;
    
    // Obtener un negocio de prueba
    const business = await prisma.business.findFirst({
      select: { id: true, name: true }
    });
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró ningún negocio para testing'
      });
    }
    
    const loadResults = [];
    
    // Simular múltiples consultas concurrentes
    for (let i = 0; i < iterations; i++) {
      const iterationStart = Date.now();
      
      const promises = [];
      for (let j = 0; j < concurrentRequests; j++) {
        promises.push(
          prisma.appointment.findMany({
            where: {
              businessId: business.id,
              startTime: { gte: new Date() }
            },
            select: { id: true, startTime: true, status: true },
            take: 20
          })
        );
      }
      
      await Promise.all(promises);
      const iterationEnd = Date.now();
      
      loadResults.push({
        iteration: i + 1,
        concurrentRequests: parseInt(concurrentRequests),
        timeMs: iterationEnd - iterationStart,
        avgTimePerRequest: Math.round((iterationEnd - iterationStart) / concurrentRequests)
      });
    }
    
    const totalTime = loadResults.reduce((sum, result) => sum + result.timeMs, 0);
    const averageTime = Math.round(totalTime / loadResults.length);
    const averageTimePerRequest = Math.round(totalTime / (loadResults.length * concurrentRequests));
    
    console.log(`📊 Test de carga completado: ${concurrentRequests} requests x ${iterations} iteraciones`);
    
    res.json({
      success: true,
      message: 'Test de carga completado exitosamente',
      data: {
        business: {
          id: business.id,
          name: business.name
        },
        results: loadResults,
        summary: {
          totalIterations: iterations,
          concurrentRequests: parseInt(concurrentRequests),
          totalRequests: iterations * concurrentRequests,
          totalTimeMs: totalTime,
          averageTimeMs: averageTime,
          averageTimePerRequestMs: averageTimePerRequest,
          requestsPerSecond: Math.round((iterations * concurrentRequests) / (totalTime / 1000))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test de carga:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando test de carga',
      error: error.message
    });
  }
};

// Test completo de optimizaciones
const runCompletePerformanceTest = async (req, res) => {
  try {
    console.log('🎯 Iniciando test completo de performance...');
    
    const startTime = Date.now();
    
    // 1. Verificar índices
    console.log('📋 Verificando índices...');
    const indexes = await prisma.$queryRaw`
      SELECT indexname, tablename FROM pg_indexes WHERE indexname LIKE 'idx_%'
    `;
    
    // 2. Ejecutar tests de consultas
    console.log('🧪 Ejecutando tests de consultas...');
    const queryTests = await Promise.all([
      // Test de disponibilidad
      prisma.appointment.findMany({
        where: { startTime: { gte: new Date() } },
        select: { id: true, startTime: true },
        take: 50
      }),
      
      // Test de clientes
      prisma.client.findMany({
        where: { email: { not: null } },
        select: { id: true, email: true },
        take: 50
      }),
      
      // Test de reseñas
      prisma.review.findMany({
        where: { isPublic: true },
        select: { id: true, rating: true },
        take: 20
      })
    ]);
    
    // 3. Test de agregaciones
    console.log('📊 Ejecutando tests de agregaciones...');
    const aggregationTests = await Promise.all([
      prisma.appointment.aggregate({
        where: { startTime: { gte: new Date() } },
        _count: { id: true }
      }),
      prisma.client.aggregate({
        _count: { id: true }
      }),
      prisma.review.aggregate({
        where: { isPublic: true },
        _count: { id: true }
      })
    ]);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`🎉 Test completo finalizado en ${totalTime}ms`);
    
    res.json({
      success: true,
      message: 'Test completo de performance ejecutado exitosamente',
      data: {
        indexes: {
          count: indexes.length,
          list: indexes.map(idx => ({ name: idx.indexname, table: idx.tablename }))
        },
        queries: {
          appointments: queryTests[0].length,
          clients: queryTests[1].length,
          reviews: queryTests[2].length
        },
        aggregations: {
          totalAppointments: aggregationTests[0]._count.id,
          totalClients: aggregationTests[1]._count.id,
          totalReviews: aggregationTests[2]._count.id
        },
        performance: {
          totalTimeMs: totalTime,
          queriesExecuted: 6,
          averageTimePerQuery: Math.round(totalTime / 6),
          optimizationLevel: indexes.length >= 5 ? 'optimized' : 
                           indexes.length >= 2 ? 'partial' : 'needs_optimization'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test completo:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando test completo de performance',
      error: error.message
    });
  }
};

module.exports = {
  testAvailabilityPerformance,
  testLoadPerformance,
  runCompletePerformanceTest
};
