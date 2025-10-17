const express = require('express');
const router = express.Router();
const {
  checkExistingIndexes,
  applyCriticalIndexes,
  testQueryPerformance,
  fullOptimization
} = require('../controllers/performanceController');

const {
  testAvailabilityPerformance,
  testLoadPerformance,
  runCompletePerformanceTest
} = require('../controllers/performanceTestController');

// Middleware para verificar que es el admin (opcional - para seguridad)
const adminOnly = (req, res, next) => {
  // En producción, podrías verificar que el usuario es admin
  // Por ahora, permitir acceso directo
  next();
};

// Ruta para verificar índices existentes
router.get('/indexes/check', adminOnly, checkExistingIndexes);

// Ruta para aplicar índices críticos
router.post('/indexes/apply', adminOnly, applyCriticalIndexes);

// Ruta para probar performance de consultas
router.get('/test/performance', adminOnly, testQueryPerformance);

// Ruta para optimización completa (índices + tests)
router.post('/optimize', adminOnly, fullOptimization);

// Rutas de testing de performance
router.get('/test/availability', adminOnly, testAvailabilityPerformance);
router.get('/test/load', adminOnly, testLoadPerformance);
router.get('/test/complete', adminOnly, runCompletePerformanceTest);

// Ruta de estado de performance
router.get('/status', async (req, res) => {
  try {
    const { prisma } = require('../config/database');
    
    // Verificar índices existentes
    const indexes = await prisma.$queryRaw`
      SELECT indexname, tablename FROM pg_indexes WHERE indexname LIKE 'idx_%'
    `;
    
    // Verificar estadísticas básicas de la DB
    const stats = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM businesses) as businesses,
        (SELECT COUNT(*) FROM appointments) as appointments,
        (SELECT COUNT(*) FROM clients) as clients,
        (SELECT COUNT(*) FROM reviews) as reviews
    `;
    
    res.json({
      success: true,
      message: 'Estado de performance del sistema',
      data: {
        indexes: {
          count: indexes.length,
          list: indexes.map(idx => ({ name: idx.indexname, table: idx.tablename }))
        },
        database: {
          businesses: Number(stats[0].businesses),
          appointments: Number(stats[0].appointments),
          clients: Number(stats[0].clients),
          reviews: Number(stats[0].reviews)
        },
        optimization: {
          indexesApplied: indexes.length > 0,
          recommendedIndexes: 5,
          optimizationLevel: indexes.length >= 5 ? 'optimized' : 
                           indexes.length >= 2 ? 'partial' : 'needed'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estado de performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado de performance',
      error: error.message
    });
  }
});

module.exports = router;
