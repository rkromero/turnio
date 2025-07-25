const express = require('express');
const { body } = require('express-validator');
const { 
  getReviews,
  getPublicReviews,
  createPublicReview,
  updateReviewStatus,
  deleteReview,
  getReviewToken
} = require('../controllers/reviewController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Validaciones para crear reseña
const createReviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser entre 1 y 5 estrellas'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('El comentario no puede exceder 500 caracteres'),
];

// Rutas públicas (sin autenticación)
router.get('/public/:businessSlug', getPublicReviews);
router.get('/public/token/:appointmentId', getReviewToken);
router.post('/public/:appointmentId', createReviewValidation, createPublicReview);

// Rutas protegidas (requieren autenticación)
router.get('/', authenticateToken, getReviews);
router.patch('/:id/status', authenticateToken, requireAdmin, updateReviewStatus);
router.delete('/:id', authenticateToken, requireAdmin, deleteReview);

module.exports = router; 