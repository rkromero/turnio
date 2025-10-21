const { prisma } = require('../config/database');

// Obtener notificaciones del usuario actual
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { includeRead = 'false' } = req.query;
    
    const where = {
      userId
    };
    
    // Si no se incluyen las leídas, filtrar solo no leídas
    if (includeRead === 'false') {
      where.isRead = false;
    }
    
    const notifications = await prisma.inAppNotification.findMany({
      where,
      include: {
        appointment: {
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
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limitar a las últimas 50
    });
    
    const unreadCount = await prisma.inAppNotification.count({
      where: {
        userId,
        isRead: false
      }
    });
    
    return res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Marcar notificación como leída
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar que la notificación pertenece al usuario
    const notification = await prisma.inAppNotification.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    // Marcar como leída
    const updated = await prisma.inAppNotification.update({
      where: { id },
      data: { isRead: true }
    });
    
    return res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Marcar todas las notificaciones como leídas
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await prisma.inAppNotification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });
    
    return res.json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas'
    });
  } catch (error) {
    console.error('Error marcando todas como leídas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead
};

