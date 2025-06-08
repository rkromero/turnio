const express = require('express');
const router = express.Router();
const clientScoringController = require('../controllers/clientScoringController');
const { authenticateToken } = require('../middleware/auth');

// Obtener scoring de un cliente (público - para mostrar en reservas)
router.get('/score', clientScoringController.getClientScore);

// Registrar evento de cliente (protegido - solo negocios autenticados)
router.post('/event', authenticateToken, clientScoringController.recordClientEvent);

// Obtener estadísticas generales (protegido - solo admins)
router.get('/stats', authenticateToken, clientScoringController.getScoringStats);

// Recalcular scoring específico (protegido - solo admins)
router.post('/recalculate/:clientScoreId', authenticateToken, clientScoringController.recalculateClientScore);

module.exports = router; 