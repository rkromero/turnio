const express = require('express');
const { getDashboardStats } = require('../controllers/dashboardController');
const { authenticateTokenOnly } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación básica (sin verificación de suscripción)
router.use(authenticateTokenOnly);

// Estadísticas del dashboard
router.get('/stats', getDashboardStats);

module.exports = router; 