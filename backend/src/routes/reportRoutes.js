const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  getDashboardMetrics, 
  getRevenueReport, 
  getServicesReport, 
  getClientsReport 
} = require('../controllers/reportController');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/reports/dashboard - Métricas generales del dashboard
router.get('/dashboard', getDashboardMetrics);

// GET /api/reports/revenue - Reporte de ingresos
router.get('/revenue', getRevenueReport);

// GET /api/reports/services - Reporte de servicios
router.get('/services', getServicesReport);

// GET /api/reports/clients - Reporte de clientes
router.get('/clients', getClientsReport);

module.exports = router; 