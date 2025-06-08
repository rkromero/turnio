const express = require('express');
const router = express.Router();
const migrationController = require('../controllers/migrationController');
const { authenticateToken } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas de migración
router.post('/migrate-users-to-branches', migrationController.migrateUsersToMainBranch);
router.get('/user-branch-stats', migrationController.getUserBranchStats);

module.exports = router; 