const express = require('express');
const router = express.Router();
const clientScoringController = require('../controllers/clientScoringController');
const { authenticateTokenOnly } = require('../middleware/auth');

// Obtener scoring de un cliente (público - para mostrar en reservas)
router.get('/score', clientScoringController.getClientScore);

// Registrar evento de cliente - PÚBLICO (para registro automático desde frontend)
router.post('/event/auto', clientScoringController.recordClientEventPublic);

// Registrar evento de cliente (protegido - solo negocios autenticados)
router.post('/event', authenticateTokenOnly, clientScoringController.recordClientEvent);

// Obtener estadísticas generales (protegido - solo admins)
router.get('/stats', authenticateTokenOnly, clientScoringController.getScoringStats);

// Recalcular scoring específico (protegido - solo admins)
router.post('/recalculate/:clientScoreId', authenticateTokenOnly, clientScoringController.recalculateClientScore);

module.exports = router; 