const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Test simple functions first
const testFunction = (req, res) => {
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
};

// GET /api/reports/dashboard - Test route
router.get('/dashboard', authMiddleware, testFunction);

// GET /api/reports/revenue - Test route
router.get('/revenue', authMiddleware, (req, res) => {
  res.json({ message: 'Revenue endpoint working' });
});

// GET /api/reports/services - Test route
router.get('/services', authMiddleware, (req, res) => {
  res.json({ message: 'Services endpoint working' });
});

// GET /api/reports/clients - Test route
router.get('/clients', authMiddleware, (req, res) => {
  res.json({ message: 'Clients endpoint working' });
});

module.exports = router; 