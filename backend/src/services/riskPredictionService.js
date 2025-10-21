/**
 * Servicio de Predicción de Riesgo de Cancelaciones
 * 
 * Utiliza Machine Learning básico y análisis estadístico
 * para predecir la probabilidad de que una cita sea cancelada
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ====================================
// PESOS DEL ALGORITMO
// ====================================

const WEIGHTS = {
  clientScore: 0.35,      // Historial del cliente (35%)
  timeSlotScore: 0.20,    // Riesgo de la hora (20%)
  serviceScore: 0.15,     // Riesgo del servicio (15%)
  anticipationScore: 0.15, // Tiempo de anticipación (15%)
  reminderScore: 0.10,    // Confirmación previa (10%)
  recencyScore: 0.05      // Cuán reciente es el cliente (5%)
};

// Thresholds de riesgo
const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 100
};

// ====================================
// CÁLCULO DE RIESGO POR FACTORES
// ====================================

/**
 * Calcula el riesgo basado en el historial del cliente
 */
async function calculateClientRisk(appointment) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: appointment.clientId }
    });

    if (!client) return 50; // Riesgo medio si no hay datos

    // Buscar scoring del cliente
    const scoring = await prisma.clientScore.findFirst({
      where: {
        OR: [
          { email: client.email },
          { phone: client.phone }
        ]
      }
    });

    if (!scoring || scoring.totalBookings === 0) {
      return 50; // Cliente nuevo = riesgo medio
    }

    // Factores que aumentan el riesgo
    let riskScore = 0;

    // 1. Tasa de cancelación histórica (0-40 puntos)
    if (scoring.cancellationRate) {
      riskScore += scoring.cancellationRate * 40;
    } else if (scoring.cancelledCount > 0) {
      const rate = scoring.cancelledCount / scoring.totalBookings;
      riskScore += rate * 40;
    }

    // 2. No-shows (0-30 puntos)
    if (scoring.noShowCount > 0) {
      const noShowRate = scoring.noShowCount / scoring.totalBookings;
      riskScore += noShowRate * 30;
    }

    // 3. Star rating bajo (0-20 puntos)
    if (scoring.starRating) {
      // Invertir: 5 estrellas = 0 riesgo, 1 estrella = 20 puntos
      riskScore += (6 - scoring.starRating) * 4;
    }

    // 4. Cancelación reciente (0-10 puntos)
    if (scoring.lastCancellationDate) {
      const daysSince = Math.floor((new Date() - new Date(scoring.lastCancellationDate)) / (1000 * 60 * 60 * 24));
      if (daysSince < 30) {
        riskScore += 10 - (daysSince / 3); // Más reciente = más riesgo
      }
    }

    return Math.min(100, Math.max(0, riskScore));

  } catch (error) {
    console.error('Error calculando riesgo de cliente:', error);
    return 50; // Default a riesgo medio en caso de error
  }
}

/**
 * Calcula el riesgo basado en la franja horaria
 */
async function calculateTimeSlotRisk(appointment) {
  try {
    const appointmentDate = new Date(appointment.startTime);
    const dayOfWeek = appointmentDate.getDay();
    const hour = appointmentDate.getHours();

    // Buscar estadísticas de esta franja horaria
    const stats = await prisma.timeSlotStats.findFirst({
      where: {
        businessId: appointment.businessId,
        OR: [
          { branchId: appointment.branchId },
          { branchId: null } // Stats globales del negocio
        ],
        dayOfWeek: dayOfWeek,
        hour: hour
      }
    });

    if (!stats || stats.totalAppointments < 5) {
      // No hay datos suficientes, usar heurísticas
      return getHeuristicTimeSlotRisk(dayOfWeek, hour);
    }

    // Usar estadísticas reales
    let riskScore = 0;

    if (stats.cancellationRate) {
      riskScore += stats.cancellationRate * 60; // Hasta 60 puntos
    }

    if (stats.noShowRate) {
      riskScore += stats.noShowRate * 40; // Hasta 40 puntos
    }

    return Math.min(100, riskScore);

  } catch (error) {
    console.error('Error calculando riesgo de franja horaria:', error);
    return getHeuristicTimeSlotRisk(
      new Date(appointment.startTime).getDay(),
      new Date(appointment.startTime).getHours()
    );
  }
}

/**
 * Heurística de riesgo por hora cuando no hay datos
 */
function getHeuristicTimeSlotRisk(dayOfWeek, hour) {
  let risk = 30; // Base

  // Lunes temprano y viernes tarde = mayor riesgo
  if (dayOfWeek === 1 && hour < 10) risk += 20;
  if (dayOfWeek === 5 && hour > 17) risk += 20;

  // Horarios muy tempranos o muy tarde
  if (hour < 8) risk += 15;
  if (hour > 19) risk += 15;

  // Fines de semana
  if (dayOfWeek === 0 || dayOfWeek === 6) risk += 10;

  return Math.min(100, risk);
}

/**
 * Calcula el riesgo basado en el tipo de servicio
 */
async function calculateServiceRisk(appointment) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: appointment.serviceId }
    });

    if (!service) return 50;

    // Si tenemos estadísticas del servicio, usarlas
    if (service.totalAppointments > 10) {
      let riskScore = 0;

      if (service.cancellationRate) {
        riskScore += service.cancellationRate * 60;
      }

      if (service.noShowRate) {
        riskScore += service.noShowRate * 40;
      }

      return Math.min(100, riskScore);
    }

    // Heurística: servicios largos o caros tienden a cancelarse más
    let risk = 20; // Base

    // Duración
    if (service.duration > 120) risk += 20; // Más de 2 horas
    else if (service.duration > 60) risk += 10; // Más de 1 hora

    // Precio (asumiendo que precios altos = más cancelaciones)
    if (service.price > 10000) risk += 20;
    else if (service.price > 5000) risk += 10;

    return Math.min(100, risk);

  } catch (error) {
    console.error('Error calculando riesgo de servicio:', error);
    return 50;
  }
}

/**
 * Calcula el riesgo basado en el tiempo de anticipación
 */
function calculateAnticipationRisk(appointment) {
  const hours = appointment.anticipationHours;

  if (!hours) {
    // Si no sabemos, asumir riesgo medio
    return 50;
  }

  let risk = 0;

  // Reservas muy anticipadas tienden a cancelarse más
  if (hours > 720) { // Más de 30 días
    risk = 80;
  } else if (hours > 336) { // Más de 2 semanas
    risk = 60;
  } else if (hours > 168) { // Más de 1 semana
    risk = 40;
  } else if (hours > 72) { // Más de 3 días
    risk = 25;
  } else if (hours > 24) { // Más de 1 día
    risk = 15;
  } else if (hours > 6) { // Más de 6 horas
    risk = 10;
  } else {
    // Muy de último momento = bajo riesgo
    risk = 5;
  }

  return risk;
}

/**
 * Calcula el riesgo basado en la confirmación del recordatorio
 */
function calculateReminderRisk(appointment) {
  // Si confirmó = bajo riesgo
  if (appointment.reminderConfirmed) {
    return 5;
  }

  // Si abrió el recordatorio pero no confirmó = riesgo medio
  if (appointment.reminderOpenedAt) {
    return 40;
  }

  // Si se envió recordatorio pero no abrió = alto riesgo
  if (appointment.reminderSent) {
    return 80;
  }

  // Si no se envió recordatorio todavía = riesgo medio-alto
  return 60;
}

/**
 * Calcula el riesgo basado en qué tan reciente es el cliente
 */
async function calculateRecencyRisk(appointment) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: appointment.clientId }
    });

    if (!client) return 50;

    // Buscar última cita completada
    const lastAppointment = await prisma.appointment.findFirst({
      where: {
        clientId: appointment.clientId,
        status: 'COMPLETED',
        id: { not: appointment.id }
      },
      orderBy: { startTime: 'desc' }
    });

    if (!lastAppointment) {
      return 60; // Cliente nuevo o sin historial = riesgo medio-alto
    }

    const daysSince = Math.floor((new Date() - new Date(lastAppointment.startTime)) / (1000 * 60 * 60 * 24));

    // Cliente muy reciente = bajo riesgo
    if (daysSince < 30) return 10;
    if (daysSince < 90) return 25;
    if (daysSince < 180) return 50;
    
    // Cliente hace mucho que no viene = alto riesgo
    return 80;

  } catch (error) {
    console.error('Error calculando riesgo de recencia:', error);
    return 50;
  }
}

/**
 * Determina el nivel de riesgo basado en el score
 */
function determineRiskLevel(riskScore) {
  if (riskScore <= RISK_THRESHOLDS.LOW) return 'LOW';
  if (riskScore <= RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Genera recomendaciones de acción basadas en el riesgo
 */
function generateSuggestedActions(riskScore, riskLevel, factors) {
  const actions = [];

  if (riskLevel === 'HIGH') {
    actions.push('call_client');
    actions.push('double_confirm');
    actions.push('send_extra_reminder');
    
    if (factors.timeSlotRisk > 70) {
      actions.push('consider_overbook');
    }
  } else if (riskLevel === 'MEDIUM') {
    actions.push('send_extra_reminder');
    
    if (!factors.reminderConfirmed) {
      actions.push('request_confirmation');
    }
  }

  // Si no confirmó el recordatorio
  if (factors.reminderRisk > 60) {
    actions.push('request_confirmation');
  }

  // Si es cliente problemático
  if (factors.clientRisk > 70) {
    actions.push('flag_for_review');
  }

  return actions;
}

// ====================================
// FUNCIÓN PRINCIPAL
// ====================================

/**
 * Calcula la predicción de riesgo para una cita
 */
async function calculateRisk(appointmentId) {
  try {
    console.log(`🔮 Calculando riesgo para cita ${appointmentId}...`);

    // Obtener la cita
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        service: true
      }
    });

    if (!appointment) {
      throw new Error('Cita no encontrada');
    }

    // Solo calcular para citas confirmadas y futuras
    if (appointment.status !== 'CONFIRMED' || new Date(appointment.startTime) < new Date()) {
      console.log('⏭️ Cita no elegible para predicción (pasada o no confirmada)');
      return null;
    }

    // Calcular cada factor
    const clientRisk = await calculateClientRisk(appointment);
    const timeSlotRisk = await calculateTimeSlotRisk(appointment);
    const serviceRisk = await calculateServiceRisk(appointment);
    const anticipationRisk = calculateAnticipationRisk(appointment);
    const reminderRisk = calculateReminderRisk(appointment);
    const recencyRisk = await calculateRecencyRisk(appointment);

    // Calcular score final ponderado
    const riskScore = (
      clientRisk * WEIGHTS.clientScore +
      timeSlotRisk * WEIGHTS.timeSlotScore +
      serviceRisk * WEIGHTS.serviceScore +
      anticipationRisk * WEIGHTS.anticipationScore +
      reminderRisk * WEIGHTS.reminderScore +
      recencyRisk * WEIGHTS.recencyScore
    );

    const riskLevel = determineRiskLevel(riskScore);

    const factors = {
      clientRisk,
      timeSlotRisk,
      serviceRisk,
      anticipationRisk,
      reminderRisk,
      recencyRisk
    };

    const suggestedActions = generateSuggestedActions(riskScore, riskLevel, {
      ...factors,
      reminderConfirmed: appointment.reminderConfirmed
    });

    // Guardar o actualizar la predicción
    const prediction = await prisma.appointmentRiskPrediction.upsert({
      where: { appointmentId: appointmentId },
      create: {
        appointmentId: appointmentId,
        riskScore: Math.round(riskScore * 100) / 100,
        riskLevel: riskLevel,
        clientRisk: Math.round(clientRisk * 100) / 100,
        timeSlotRisk: Math.round(timeSlotRisk * 100) / 100,
        serviceRisk: Math.round(serviceRisk * 100) / 100,
        anticipationRisk: Math.round(anticipationRisk * 100) / 100,
        reminderRisk: Math.round(reminderRisk * 100) / 100,
        suggestedActions: suggestedActions
      },
      update: {
        riskScore: Math.round(riskScore * 100) / 100,
        riskLevel: riskLevel,
        clientRisk: Math.round(clientRisk * 100) / 100,
        timeSlotRisk: Math.round(timeSlotRisk * 100) / 100,
        serviceRisk: Math.round(serviceRisk * 100) / 100,
        anticipationRisk: Math.round(anticipationRisk * 100) / 100,
        reminderRisk: Math.round(reminderRisk * 100) / 100,
        suggestedActions: suggestedActions,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Predicción calculada: ${riskLevel} (${Math.round(riskScore)}%)`);

    return prediction;

  } catch (error) {
    console.error('❌ Error calculando riesgo:', error);
    throw error;
  }
}

/**
 * Recalcula todas las predicciones de riesgo para citas futuras
 */
async function recalculateAllRisks(businessId = null) {
  try {
    console.log('🔄 Recalculando predicciones de riesgo...');

    const where = {
      status: 'CONFIRMED',
      startTime: { gte: new Date() }
    };

    if (businessId) {
      where.businessId = businessId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: { id: true }
    });

    console.log(`📊 ${appointments.length} citas encontradas`);

    let calculated = 0;
    let errors = 0;

    for (const appointment of appointments) {
      try {
        await calculateRisk(appointment.id);
        calculated++;

        if (calculated % 10 === 0) {
          console.log(`   ⏳ ${calculated}/${appointments.length} procesadas...`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Error en cita ${appointment.id}:`, error.message);
      }
    }

    console.log('\n✅ Recálculo completado');
    console.log(`   Calculadas: ${calculated}`);
    console.log(`   Errores: ${errors}`);

    return { calculated, errors, total: appointments.length };

  } catch (error) {
    console.error('❌ Error en recálculo masivo:', error);
    throw error;
  }
}

/**
 * Actualiza las estadísticas de franjas horarias
 */
async function updateTimeSlotStats(businessId = null) {
  try {
    console.log('📊 Actualizando estadísticas de franjas horarias...');

    const where = {};
    if (businessId) {
      where.businessId = businessId;
    }

    // Obtener todas las citas completadas, canceladas y no-shows
    const appointments = await prisma.appointment.findMany({
      where: {
        ...where,
        status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] }
      },
      select: {
        id: true,
        businessId: true,
        branchId: true,
        startTime: true,
        status: true
      }
    });

    // Agrupar por negocio, sucursal, día y hora
    const stats = {};

    for (const apt of appointments) {
      const date = new Date(apt.startTime);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      const key = `${apt.businessId}_${apt.branchId || 'null'}_${dayOfWeek}_${hour}`;

      if (!stats[key]) {
        stats[key] = {
          businessId: apt.businessId,
          branchId: apt.branchId,
          dayOfWeek,
          hour,
          total: 0,
          cancelled: 0,
          noShow: 0,
          completed: 0
        };
      }

      stats[key].total++;
      if (apt.status === 'CANCELLED') stats[key].cancelled++;
      if (apt.status === 'NO_SHOW') stats[key].noShow++;
      if (apt.status === 'COMPLETED') stats[key].completed++;
    }

    // Guardar en la base de datos
    let updated = 0;

    for (const key in stats) {
      const stat = stats[key];
      const cancellationRate = stat.total > 0 ? (stat.cancelled / stat.total) * 100 : 0;
      const noShowRate = stat.total > 0 ? (stat.noShow / stat.total) * 100 : 0;
      const completionRate = stat.total > 0 ? (stat.completed / stat.total) * 100 : 0;

      await prisma.timeSlotStats.upsert({
        where: {
          businessId_branchId_dayOfWeek_hour: {
            businessId: stat.businessId,
            branchId: stat.branchId,
            dayOfWeek: stat.dayOfWeek,
            hour: stat.hour
          }
        },
        create: {
          id: `${Date.now()}_${key}`,
          businessId: stat.businessId,
          branchId: stat.branchId,
          dayOfWeek: stat.dayOfWeek,
          hour: stat.hour,
          totalAppointments: stat.total,
          cancelledCount: stat.cancelled,
          noShowCount: stat.noShow,
          completedCount: stat.completed,
          cancellationRate,
          noShowRate,
          completionRate,
          lastCalculated: new Date()
        },
        update: {
          totalAppointments: stat.total,
          cancelledCount: stat.cancelled,
          noShowCount: stat.noShow,
          completedCount: stat.completed,
          cancellationRate,
          noShowRate,
          completionRate,
          lastCalculated: new Date(),
          updatedAt: new Date()
        }
      });

      updated++;
    }

    console.log(`✅ ${updated} franjas horarias actualizadas`);

    return { updated };

  } catch (error) {
    console.error('❌ Error actualizando estadísticas:', error);
    throw error;
  }
}

module.exports = {
  calculateRisk,
  recalculateAllRisks,
  updateTimeSlotStats,
  RISK_THRESHOLDS
};

