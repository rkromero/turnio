const express = require('express');
const router = express.Router();
const clientScoringController = require('../controllers/clientScoringController');
const authMiddleware = require('../middleware/authMiddleware');

// Obtener scoring de un cliente (público - para mostrar en reservas)
router.get('/score', clientScoringController.getClientScore);

// Registrar evento de cliente (protegido - solo negocios autenticados)
router.post('/event', authMiddleware, clientScoringController.recordClientEvent);

// Obtener estadísticas generales (protegido - solo admins)
router.get('/stats', authMiddleware, clientScoringController.getScoringStats);

// Recalcular scoring específico (protegido - solo admins)
router.post('/recalculate/:clientScoreId', authMiddleware, clientScoringController.recalculateClientScore);

module.exports = router; 