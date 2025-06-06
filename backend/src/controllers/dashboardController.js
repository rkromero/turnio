const { prisma } = require('../config/database');

// Obtener estadísticas del dashboard
const getDashboardStats = async (req, res) => {
  try {
    const businessId = req.businessId;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Estadísticas paralelas
    const [
      todayAppointments,
      totalClients,
      monthlyRevenue,
      totalServices,
      upcomingAppointments
    ] = await Promise.all([
      // Turnos de hoy
      prisma.appointment.count({
        where: {
          businessId,
          startTime: {
            gte: startOfDay,
            lt: endOfDay
          },
          status: { not: 'CANCELLED' }
        }
      }),

      // Total de clientes
      prisma.client.count({
        where: { businessId }
      }),

      // Ingresos del mes (aproximado basado en servicios)
      prisma.appointment.findMany({
        where: {
          businessId,
          startTime: {
            gte: startOfMonth,
            lt: endOfMonth
          },
          status: 'COMPLETED'
        },
        include: {
          service: {
            select: { price: true }
          }
        }
      }),

      // Total de servicios activos
      prisma.service.count({
        where: {
          businessId,
          isActive: true
        }
      }),

      // Próximos turnos (siguientes 5)
      prisma.appointment.findMany({
        where: {
          businessId,
          startTime: { gte: new Date() },
          status: { not: 'CANCELLED' }
        },
        include: {
          client: {
            select: { name: true }
          },
          service: {
            select: { name: true }
          }
        },
        orderBy: { startTime: 'asc' },
        take: 5
      })
    ]);

    // Calcular ingresos del mes
    const monthRevenue = monthlyRevenue.reduce((total, appointment) => {
      return total + (appointment.service?.price || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        todayAppointments,
        totalClients,
        monthRevenue,
        totalServices,
        upcomingAppointments: upcomingAppointments.map(appointment => ({
          id: appointment.id,
          clientName: appointment.client.name,
          serviceName: appointment.service.name,
          startTime: appointment.startTime,
          status: appointment.status
        }))
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getDashboardStats
}; 