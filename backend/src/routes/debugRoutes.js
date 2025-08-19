const express = require('express');
const router = express.Router();
const { 
  applyPerformanceIndexes, 
  checkIndexes, 
  monitorIndexUsage,
  checkTableStructure
} = require('../controllers/debugController');

// Rutas para gestión de índices de performance
router.post('/apply-performance-indexes', applyPerformanceIndexes);
router.get('/check-indexes', checkIndexes);
router.get('/monitor-indexes', monitorIndexUsage);
router.get('/check-table-structure', checkTableStructure);

module.exports = router;
