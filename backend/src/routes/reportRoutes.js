const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getDashboardMetrics,
  getRevenueReport,
  getServicesReport,
  getClientsReport
} = require('../controllers/reportController');

// GET /api/reports/dashboard - Métricas generales del dashboard
router.get('/dashboard', authMiddleware, getDashboardMetrics);

// GET /api/reports/revenue - Reporte detallado de ingresos
router.get('/revenue', authMiddleware, getRevenueReport);

// GET /api/reports/services - Reporte de servicios
router.get('/services', authMiddleware, getServicesReport);

// GET /api/reports/clients - Reporte de clientes
router.get('/clients', authMiddleware, getClientsReport);

module.exports = router; 