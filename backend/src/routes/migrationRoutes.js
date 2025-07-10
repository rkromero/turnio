const express = require('express');
const router = express.Router();
const migrationController = require('../controllers/migrationController');
const { authenticateToken, authenticateTokenOnly } = require('../middleware/auth');

// Rutas de migración
router.post('/migrate-users-to-branches', authenticateToken, migrationController.migrateUsersToMainBranch);
router.get('/user-branch-stats', authenticateToken, migrationController.getUserBranchStats);
router.post('/fix-subscription', authenticateTokenOnly, migrationController.fixProblematicSubscription);

module.exports = router; 