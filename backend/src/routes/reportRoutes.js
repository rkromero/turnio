const express = require('express');
const router = express.Router();
const { authenticateTokenOnly } = require('../middleware/auth');
const { 
  getDashboardMetrics, 
  getRevenueReport, 
  getServicesReport, 
  getClientsReport 
} = require('../controllers/reportController');

// Rutas de reportes (solo verifican token)
router.get('/dashboard', authenticateTokenOnly, getDashboardMetrics);
router.get('/revenue', authenticateTokenOnly, getRevenueReport);
router.get('/services', authenticateTokenOnly, getServicesReport);
router.get('/clients', authenticateTokenOnly, getClientsReport);

module.exports = router; 