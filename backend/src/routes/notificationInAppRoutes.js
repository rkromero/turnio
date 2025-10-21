const express = require('express');
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationInAppController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener notificaciones del usuario
router.get('/', getUserNotifications);

// Marcar notificación como leída
router.patch('/:id/read', markAsRead);

// Marcar todas como leídas
router.post('/read-all', markAllAsRead);

module.exports = router;

