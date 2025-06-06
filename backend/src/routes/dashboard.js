const express = require('express');
const { getDashboardStats } = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Estadísticas del dashboard
router.get('/stats', getDashboardStats);

module.exports = router; 