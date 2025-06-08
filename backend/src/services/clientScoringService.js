const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Verificar si las tablas de scoring existen
const checkScoringTablesExist = async () => {
  try {
    await prisma.clientScore.findFirst();
    return true;
  } catch (error) {
    if (error.message.includes('does not exist') || error.message.includes('relation') || error.code === 'P2021') {
      console.log('⚠️ Tablas de scoring no existen todavía. Sistema funcionando en modo básico.');
      return false;
    }
    throw error;
  }
};

// Configuración del sistema de scoring
const SCORING_CONFIG = {
  ATTENDED: { points: 1, weight: 1 },
  NO_SHOW: { points: -2, weight: 1 },
  CANCELLED_LATE: { points: -1, weight: 0.8 },
  CANCELLED_GOOD: { points: 0.5, weight: 0.5 }
};

// Pesos por antigüedad
const getTimeWeight = (eventDate) => {
  const daysDiff = Math.floor((new Date() - new Date(eventDate)) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 30) return 1.0;      // Últimos 30 días
  if (daysDiff <= 90) return 0.8;      // 31-90 días
  if (daysDiff <= 180) return 0.6;     // 91-180 días
  return 0.4;                          // Más de 180 días
};

// Convertir puntos a estrellas (1-5)
const calculateStarRating = (totalPoints, totalWeight) => {
  if (totalWeight === 0) return null; // Sin historial
  
  const average = totalPoints / totalWeight;
  const percentage = Math.max(0, Math.min(1, (average + 2) / 4)); // Normalizar entre 0-1
  
  if (percentage < 0.2) return 1;      // < 20%
  if (percentage < 0.4) return 2;      // 20-40%
  if (percentage < 0.6) return 3;      // 40-60%
  if (percentage < 0.8) return 4;      // 60-80%
  return 5;                            // > 80%
};

// Buscar o crear cliente por email/telefono
const findOrCreateClient = async (email, phone, name) => {
  // Las tablas ya fueron verificadas en las funciones que llaman a esta
  let clientScore = null;
  
  // Buscar por email primero
  if (email) {
    clientScore = await prisma.clientScore.findUnique({
      where: { email }
    });
  }
  
  // Si no se encuentra por email, buscar por teléfono
  if (!clientScore && phone) {
    clientScore = await prisma.clientScore.findUnique({
      where: { phone }
    });
  }
  
  // Si no existe, crear nuevo
  if (!clientScore) {
    clientScore = await prisma.clientScore.create({
      data: {
        email: email || null,
        phone: phone || null,
        name: name || 'Cliente',
        totalPoints: 0,
        totalWeight: 0,
        starRating: null,
        totalBookings: 0,
        attendedCount: 0,
        noShowCount: 0,
        lastActivity: new Date()
      }
    });
  } else {
    // Actualizar datos si es necesario
    const updateData = {};
    if (email && !clientScore.email) updateData.email = email;
    if (phone && !clientScore.phone) updateData.phone = phone;
    if (name) updateData.name = name;
    updateData.lastActivity = new Date();
    
    if (Object.keys(updateData).length > 0) {
      clientScore = await prisma.clientScore.update({
        where: { id: clientScore.id },
        data: updateData
      });
    }
  }
  
  return clientScore;
};

// Recalcular scoring completo de un cliente
const recalculateClientScore = async (clientScoreId) => {
  try {
    // Verificar si las tablas existen
    const tablesExist = await checkScoringTablesExist();
    if (!tablesExist) {
      return {
        starRating: null,
        totalBookings: 0,
        attendedCount: 0,
        noShowCount: 0
      };
    }

    // Obtener todo el historial del cliente
    const history = await prisma.clientHistory.findMany({
      where: { clientScoreId },
      orderBy: { eventDate: 'desc' }
    });
    
    let totalPoints = 0;
    let totalWeight = 0;
    let attendedCount = 0;
    let noShowCount = 0;
    
    // Recalcular con pesos actualizados
    history.forEach(event => {
      const timeWeight = getTimeWeight(event.eventDate);
      const finalWeight = event.weight * timeWeight;
      
      totalPoints += event.points * timeWeight;
      totalWeight += finalWeight;
      
      if (event.eventType === 'ATTENDED') attendedCount++;
      if (event.eventType === 'NO_SHOW') noShowCount++;
    });
    
    const starRating = calculateStarRating(totalPoints, totalWeight);
    
    // Actualizar cliente
    return await prisma.clientScore.update({
      where: { id: clientScoreId },
      data: {
        totalPoints,
        totalWeight,
        starRating,
        totalBookings: history.length,
        attendedCount,
        noShowCount
      }
    });

  } catch (error) {
    console.error('Error recalculando scoring:', error);
    return {
      starRating: null,
      totalBookings: 0,
      attendedCount: 0,
      noShowCount: 0
    };
  }
};

// Registrar evento de cliente
const recordClientEvent = async (email, phone, name, businessId, appointmentId, eventType, notes = null) => {
  try {
    // Verificar si las tablas existen
    const tablesExist = await checkScoringTablesExist();
    if (!tablesExist) {
      console.log('⚠️ Sistema de scoring no disponible - tablas no existen');
      return {
        starRating: null,
        totalBookings: 0,
        attendedCount: 0,
        noShowCount: 0,
        message: 'Sistema de scoring no disponible'
      };
    }

    // Buscar o crear cliente
    const clientScore = await findOrCreateClient(email, phone, name);
    
    // Verificar si ya existe este evento
    const existingEvent = await prisma.clientHistory.findFirst({
      where: {
        clientScoreId: clientScore.id,
        appointmentId: appointmentId
      }
    });
    
    if (existingEvent) {
      // Si ya existe, actualizar el evento
      const config = SCORING_CONFIG[eventType];
      await prisma.clientHistory.update({
        where: { id: existingEvent.id },
        data: {
          eventType,
          points: config.points,
          weight: config.weight,
          notes,
          eventDate: new Date()
        }
      });
    } else {
      // Crear nuevo evento
      const config = SCORING_CONFIG[eventType];
      await prisma.clientHistory.create({
        data: {
          clientScoreId: clientScore.id,
          businessId,
          appointmentId,
          eventType,
          points: config.points,
          weight: config.weight,
          notes,
          eventDate: new Date()
        }
      });
    }
    
    // Recalcular scoring
    const updatedClient = await recalculateClientScore(clientScore.id);
    return updatedClient;
    
  } catch (error) {
    console.error('Error registrando evento de cliente:', error);
    // En caso de error, devolver valores por defecto
    return {
      starRating: null,
      totalBookings: 0,
      attendedCount: 0,
      noShowCount: 0,
      message: 'Error en sistema de scoring'
    };
  }
};

// Obtener scoring de un cliente
const getClientScore = async (email, phone) => {
  try {
    // Verificar si las tablas existen
    const tablesExist = await checkScoringTablesExist();
    if (!tablesExist) {
      return null;
    }

    let clientScore = null;
    
    if (email) {
      clientScore = await prisma.clientScore.findUnique({
        where: { email },
        include: {
          history: {
            orderBy: { eventDate: 'desc' },
            take: 10 // Últimos 10 eventos
          }
        }
      });
    }
    
    if (!clientScore && phone) {
      clientScore = await prisma.clientScore.findUnique({
        where: { phone },
        include: {
          history: {
            orderBy: { eventDate: 'desc' },
            take: 10
          }
        }
      });
    }
    
    return clientScore;

  } catch (error) {
    console.error('Error obteniendo scoring del cliente:', error);
    return null;
  }
};

// Obtener estadísticas generales
const getClientScoringStats = async () => {
  try {
    // Verificar si las tablas existen
    const tablesExist = await checkScoringTablesExist();
    if (!tablesExist) {
      return {
        totalClients: 0,
        averageRating: null,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, null: 0 }
      };
    }

    const stats = await prisma.clientScore.aggregate({
      _count: { id: true },
      _avg: { starRating: true }
    });
    
    const distributionQuery = await prisma.clientScore.groupBy({
      by: ['starRating'],
      _count: { starRating: true }
    });
    
    const distribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, null: 0
    };
    
    distributionQuery.forEach(item => {
      distribution[item.starRating || 'null'] = item._count.starRating;
    });
    
    return {
      totalClients: stats._count.id,
      averageRating: stats._avg.starRating,
      distribution
    };

  } catch (error) {
    console.error('Error obteniendo estadísticas de scoring:', error);
    return {
      totalClients: 0,
      averageRating: null,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, null: 0 }
    };
  }
};

module.exports = {
  recordClientEvent,
  getClientScore,
  recalculateClientScore,
  getClientScoringStats,
  findOrCreateClient
}; 