const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todas las reseñas del negocio
const getReviews = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { includeUnapproved = false } = req.query;

    const where = { businessId };
    if (!includeUnapproved) {
      where.isApproved = true;
      where.isPublic = true;
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        },
        appointment: {
          select: {
            id: true,
            startTime: true,
            service: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular estadísticas
    const stats = {
      totalReviews: reviews.length,
      averageRating: reviews.length > 0 
        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
        : 0,
      ratingDistribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      }
    };

    res.json({
      success: true,
      data: {
        reviews,
        stats
      }
    });

  } catch (error) {
    console.error('Error obteniendo reseñas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener reseñas públicas por slug del negocio (sin autenticación)
const getPublicReviews = async (req, res) => {
  try {
    const { businessSlug } = req.params;
    const { limit = 10 } = req.query;

    // Buscar el negocio por slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    const reviews = await prisma.review.findMany({
      where: {
        businessId: business.id,
        isApproved: true,
        isPublic: true
      },
      include: {
        client: {
          select: {
            name: true
          }
        },
        appointment: {
          select: {
            service: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit)
    });

    // Calcular estadísticas públicas
    const allReviews = await prisma.review.findMany({
      where: {
        businessId: business.id,
        isApproved: true,
        isPublic: true
      },
      select: {
        rating: true
      }
    });

    const stats = {
      totalReviews: allReviews.length,
      averageRating: allReviews.length > 0 
        ? (allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length).toFixed(1)
        : 0,
      ratingDistribution: {
        5: allReviews.filter(r => r.rating === 5).length,
        4: allReviews.filter(r => r.rating === 4).length,
        3: allReviews.filter(r => r.rating === 3).length,
        2: allReviews.filter(r => r.rating === 2).length,
        1: allReviews.filter(r => r.rating === 1).length,
      }
    };

    res.json({
      success: true,
      data: {
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug
        },
        reviews,
        stats
      }
    });

  } catch (error) {
    console.error('Error obteniendo reseñas públicas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear reseña pública (sin autenticación)
const createPublicReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { appointmentId } = req.params;
    const { rating, comment } = req.body;

    // Verificar que la cita existe y está completada
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        business: true,
        client: true,
        service: true,
        review: true
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar que la cita está completada
    if (appointment.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden reseñar citas completadas'
      });
    }

    // Verificar que no existe una reseña previa
    if (appointment.review) {
      return res.status(400).json({
        success: false,
        message: 'Esta cita ya tiene una reseña'
      });
    }

    // Verificar que la cita fue hace al menos 1 hora
    const now = new Date();
    const appointmentEnd = new Date(appointment.endTime);
    const hoursSinceAppointment = (now - appointmentEnd) / (1000 * 60 * 60);

    if (hoursSinceAppointment < 1) {
      return res.status(400).json({
        success: false,
        message: 'Debe esperar al menos 1 hora después del servicio para dejar una reseña'
      });
    }

    // Crear la reseña
    const review = await prisma.review.create({
      data: {
        businessId: appointment.businessId,
        clientId: appointment.clientId,
        appointmentId: appointment.id,
        rating: parseInt(rating),
        comment: comment?.trim() || null,
        isApproved: rating >= 4 // Auto-aprobar reseñas de 4-5 estrellas
      },
      include: {
        client: {
          select: {
            name: true
          }
        },
        appointment: {
          select: {
            service: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Reseña creada exitosamente',
      data: review
    });

  } catch (error) {
    console.error('Error creando reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Aprobar/rechazar reseña (solo admin)
const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved, isPublic } = req.body;
    const businessId = req.businessId;

    const review = await prisma.review.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Reseña no encontrada'
      });
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        isApproved: isApproved !== undefined ? isApproved : review.isApproved,
        isPublic: isPublic !== undefined ? isPublic : review.isPublic
      },
      include: {
        client: {
          select: {
            name: true
          }
        },
        appointment: {
          select: {
            service: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Reseña actualizada exitosamente',
      data: updatedReview
    });

  } catch (error) {
    console.error('Error actualizando reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar reseña
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    const review = await prisma.review.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Reseña no encontrada'
      });
    }

    await prisma.review.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Reseña eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener token para reseña pública
const getReviewToken = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        business: true,
        client: true,
        service: true,
        review: true
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    if (appointment.review) {
      return res.status(400).json({
        success: false,
        message: 'Esta cita ya tiene una reseña'
      });
    }

    // Generar datos para el formulario de reseña
    const reviewData = {
      appointmentId: appointment.id,
      business: {
        name: appointment.business.name,
        slug: appointment.business.slug
      },
      client: {
        name: appointment.client.name
      },
      service: {
        name: appointment.service.name
      },
      appointmentDate: appointment.startTime,
      canReview: appointment.status === 'COMPLETED'
    };

    res.json({
      success: true,
      data: reviewData
    });

  } catch (error) {
    console.error('Error obteniendo token de reseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getReviews,
  getPublicReviews,
  createPublicReview,
  updateReviewStatus,
  deleteReview,
  getReviewToken
}; 