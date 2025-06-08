const clientScoringService = require('../services/clientScoringService');

// Obtener scoring de un cliente (para mostrar en reservas)
const getClientScore = async (req, res) => {
  try {
    const { email, phone } = req.query;
    
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere email o teléfono'
      });
    }

    const score = await clientScoringService.getClientScore(email, phone);
    
    res.json({
      success: true,
      data: score
    });
    
  } catch (error) {
    console.error('Error obteniendo scoring del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Registrar evento de cliente (completar/cancelar cita)
const recordClientEvent = async (req, res) => {
  try {
    const { email, phone, name, appointmentId, eventType, notes } = req.body;
    const businessId = req.user?.businessId; // Desde middleware de auth
    
    if (!appointmentId || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'appointmentId y eventType son requeridos'
      });
    }
    
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere email o teléfono del cliente'
      });
    }
    
    const validEventTypes = ['ATTENDED', 'NO_SHOW', 'CANCELLED_LATE', 'CANCELLED_GOOD'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de evento inválido'
      });
    }
    
    const updatedClient = await clientScoringService.recordClientEvent(
      email,
      phone,
      name,
      businessId,
      appointmentId,
      eventType,
      notes
    );
    
    res.json({
      success: true,
      data: {
        clientScore: {
          starRating: updatedClient.starRating,
          totalBookings: updatedClient.totalBookings,
          attendedCount: updatedClient.attendedCount,
          noShowCount: updatedClient.noShowCount
        },
        message: 'Evento registrado exitosamente'
      }
    });
    
  } catch (error) {
    console.error('Error registrando evento del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas generales del scoring (para dashboard admin)
const getScoringStats = async (req, res) => {
  try {
    const stats = await clientScoringService.getClientScoringStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas de scoring:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Recalcular scoring de un cliente específico (para mantenimiento)
const recalculateClientScore = async (req, res) => {
  try {
    const { clientScoreId } = req.params;
    
    const updatedClient = await clientScoringService.recalculateClientScore(clientScoreId);
    
    res.json({
      success: true,
      data: {
        clientScore: {
          starRating: updatedClient.starRating,
          totalBookings: updatedClient.totalBookings,
          attendedCount: updatedClient.attendedCount,
          noShowCount: updatedClient.noShowCount
        },
        message: 'Scoring recalculado exitosamente'
      }
    });
    
  } catch (error) {
    console.error('Error recalculando scoring:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getClientScore,
  recordClientEvent,
  getScoringStats,
  recalculateClientScore
}; 