/**
 * Controlador de Predicción de Riesgo
 * 
 * Maneja todas las operaciones relacionadas con la predicción
 * de cancelaciones usando ML
 */

const { PrismaClient } = require('@prisma/client');
const riskPredictionService = require('../services/riskPredictionService');

const prisma = new PrismaClient();

/**
 * Obtener predicción de riesgo de una cita específica
 * GET /api/risk-predictions/:appointmentId
 */
const getRiskPrediction = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const businessId = req.businessId;

    // Verificar que la cita pertenece al negocio
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        businessId: businessId
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Obtener predicción
    const prediction = await prisma.appointmentRiskPrediction.findUnique({
      where: { appointmentId: appointmentId }
    });

    if (!prediction) {
      // Si no existe, calcularla ahora
      const newPrediction = await riskPredictionService.calculateRisk(appointmentId);
      
      return res.json({
        success: true,
        data: newPrediction,
        message: 'Predicción calculada'
      });
    }

    res.json({
      success: true,
      data: prediction
    });

  } catch (error) {
    console.error('Error obteniendo predicción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener predicción de riesgo',
      error: error.message
    });
  }
};

/**
 * Obtener todas las citas con alto riesgo
 * GET /api/risk-predictions/risky
 */
const getRiskyAppointments = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { 
      level = 'HIGH', // LOW, MEDIUM, HIGH, ALL
      limit = 50,
      branchId 
    } = req.query;

    // Construir filtro de riesgo
    const riskFilter = {};
    if (level !== 'ALL') {
      riskFilter.riskLevel = level;
    }

    // Obtener citas con riesgo
    const riskyAppointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId,
        branchId: branchId || undefined,
        status: 'CONFIRMED',
        startTime: { gte: new Date() }, // Solo futuras
        riskPrediction: riskFilter.riskLevel ? {
          riskLevel: riskFilter.riskLevel
        } : {
          isNot: null
        }
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        riskPrediction: true
      },
      orderBy: [
        { riskPrediction: { riskScore: 'desc' } },
        { startTime: 'asc' }
      ],
      take: parseInt(limit)
    });

    // Calcular estadísticas
    const stats = {
      total: riskyAppointments.length,
      high: riskyAppointments.filter(a => a.riskPrediction?.riskLevel === 'HIGH').length,
      medium: riskyAppointments.filter(a => a.riskPrediction?.riskLevel === 'MEDIUM').length,
      low: riskyAppointments.filter(a => a.riskPrediction?.riskLevel === 'LOW').length
    };

    res.json({
      success: true,
      data: riskyAppointments,
      stats: stats,
      count: riskyAppointments.length
    });

  } catch (error) {
    console.error('Error obteniendo citas de riesgo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener citas de riesgo',
      error: error.message
    });
  }
};

/**
 * Calcular o recalcular predicción de una cita
 * POST /api/risk-predictions/calculate/:appointmentId
 */
const calculatePrediction = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const businessId = req.businessId;

    // Verificar que la cita pertenece al negocio
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        businessId: businessId
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Calcular predicción
    const prediction = await riskPredictionService.calculateRisk(appointmentId);

    if (!prediction) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo calcular la predicción (cita no elegible)'
      });
    }

    res.json({
      success: true,
      data: prediction,
      message: 'Predicción calculada exitosamente'
    });

  } catch (error) {
    console.error('Error calculando predicción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular predicción',
      error: error.message
    });
  }
};

/**
 * Recalcular todas las predicciones del negocio
 * POST /api/risk-predictions/recalculate-all
 */
const recalculateAll = async (req, res) => {
  try {
    const businessId = req.businessId;
    const userRole = req.user?.role;

    // Solo ADMIN puede recalcular todo
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden recalcular todas las predicciones'
      });
    }

    // Ejecutar recálculo en background
    res.json({
      success: true,
      message: 'Recálculo iniciado. Esto puede tomar unos minutos.',
      status: 'processing'
    });

    // Ejecutar de forma asíncrona
    riskPredictionService.recalculateAllRisks(businessId)
      .then(result => {
        console.log('✅ Recálculo completado:', result);
      })
      .catch(error => {
        console.error('❌ Error en recálculo:', error);
      });

  } catch (error) {
    console.error('Error iniciando recálculo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar recálculo',
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de predicción
 * GET /api/risk-predictions/stats
 */
const getStats = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { branchId } = req.query;

    // Contar citas por nivel de riesgo
    const where = {
      businessId: businessId,
      branchId: branchId || undefined,
      status: 'CONFIRMED',
      startTime: { gte: new Date() }
    };

    const [
      totalWithPrediction,
      highRisk,
      mediumRisk,
      lowRisk,
      totalAppointments
    ] = await Promise.all([
      prisma.appointment.count({
        where: {
          ...where,
          riskPrediction: { isNot: null }
        }
      }),
      prisma.appointment.count({
        where: {
          ...where,
          riskPrediction: { riskLevel: 'HIGH' }
        }
      }),
      prisma.appointment.count({
        where: {
          ...where,
          riskPrediction: { riskLevel: 'MEDIUM' }
        }
      }),
      prisma.appointment.count({
        where: {
          ...where,
          riskPrediction: { riskLevel: 'LOW' }
        }
      }),
      prisma.appointment.count({ where })
    ]);

    // Próximas citas de alto riesgo (esta semana)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingHighRisk = await prisma.appointment.count({
      where: {
        businessId: businessId,
        branchId: branchId || undefined,
        status: 'CONFIRMED',
        startTime: {
          gte: new Date(),
          lte: nextWeek
        },
        riskPrediction: { riskLevel: 'HIGH' }
      }
    });

    res.json({
      success: true,
      data: {
        total: totalAppointments,
        withPrediction: totalWithPrediction,
        withoutPrediction: totalAppointments - totalWithPrediction,
        byLevel: {
          high: highRisk,
          medium: mediumRisk,
          low: lowRisk
        },
        upcomingHighRisk: upcomingHighRisk,
        coverage: totalAppointments > 0 
          ? Math.round((totalWithPrediction / totalAppointments) * 100) 
          : 0
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

/**
 * Actualizar estadísticas de franjas horarias
 * POST /api/risk-predictions/update-time-slot-stats
 */
const updateTimeSlotStats = async (req, res) => {
  try {
    const businessId = req.businessId;
    const userRole = req.user?.role;

    // Solo ADMIN puede actualizar estadísticas
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden actualizar estadísticas'
      });
    }

    // Ejecutar actualización
    res.json({
      success: true,
      message: 'Actualización de estadísticas iniciada',
      status: 'processing'
    });

    // Ejecutar de forma asíncrona
    riskPredictionService.updateTimeSlotStats(businessId)
      .then(result => {
        console.log('✅ Estadísticas actualizadas:', result);
      })
      .catch(error => {
        console.error('❌ Error actualizando estadísticas:', error);
      });

  } catch (error) {
    console.error('Error actualizando estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estadísticas',
      error: error.message
    });
  }
};

module.exports = {
  getRiskPrediction,
  getRiskyAppointments,
  calculatePrediction,
  recalculateAll,
  getStats,
  updateTimeSlotStats
};

