const { prisma } = require('../config/database');

// Obtener métricas generales del dashboard
const getDashboardMetrics = async (req, res) => {
  try {
    const businessId = req.businessId; // Viene del middleware de auth
    const { period = '30' } = req.query; // días
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Obtener citas completadas del período con sus servicios
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId,
        status: 'COMPLETED',
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        service: true,
        client: true
      }
    });

    // Calcular ingresos totales
    const revenue = completedAppointments.reduce((sum, apt) => sum + apt.service.price, 0);

    // Citas por estado en el período
    const appointmentsByStatus = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        businessId: businessId,
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    });

    // Servicios más populares
    const popularServices = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        businessId: businessId,
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    // Obtener nombres de servicios
    const serviceNames = await prisma.service.findMany({
      where: {
        id: {
          in: popularServices.map(s => s.serviceId)
        }
      },
      select: {
        id: true,
        name: true,
        price: true
      }
    });

    const servicesWithNames = popularServices.map(service => ({
      ...service,
      service: serviceNames.find(s => s.id === service.serviceId)
    }));

    // Ingresos diarios para el gráfico
    const revenueByDay = {};
    completedAppointments.forEach(apt => {
      const day = apt.startTime.toISOString().split('T')[0];
      if (!revenueByDay[day]) {
        revenueByDay[day] = 0;
      }
      revenueByDay[day] += apt.service.price;
    });

    // Horarios más demandados (basado en hora de inicio)
    const allAppointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId,
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        startTime: true
      }
    });

    const hourlyStats = {};
    allAppointments.forEach(apt => {
      const hour = new Date(apt.startTime).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourlyStats[hourKey] = (hourlyStats[hourKey] || 0) + 1;
    });

    // Total de clientes únicos
    const uniqueClients = await prisma.appointment.findMany({
      where: {
        businessId: businessId,
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        clientId: true
      },
      distinct: ['clientId']
    });

    res.json({
      period: parseInt(period),
      revenue: revenue,
      totalAppointments: completedAppointments.length,
      uniqueClients: uniqueClients.length,
      appointmentsByStatus: appointmentsByStatus.map(status => ({
        status: status.status,
        count: status._count.id
      })),
      popularServices: servicesWithNames,
      dailyRevenue: Object.entries(revenueByDay).map(([date, amount]) => ({
        date,
        amount
      })).sort((a, b) => a.date.localeCompare(b.date)),
      hourlyStats: Object.entries(hourlyStats).map(([hour, count]) => ({
        hour,
        count
      })).sort((a, b) => a.hour.localeCompare(b.hour))
    });

  } catch (error) {
    console.error('Error al obtener métricas del dashboard:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener reporte de ingresos
const getRevenueReport = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    const completedAppointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId,
        status: 'COMPLETED',
        startTime: {
          gte: start,
          lte: end
        }
      },
      include: {
        service: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Agrupar por período
    const grouped = {};
    completedAppointments.forEach(apt => {
      let key;
      const date = new Date(apt.startTime);
      
      switch(groupBy) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'day':
        default:
          key = date.toISOString().split('T')[0];
          break;
      }
      
      if (!grouped[key]) {
        grouped[key] = { revenue: 0, appointments: 0 };
      }
      grouped[key].revenue += apt.service.price;
      grouped[key].appointments += 1;
    });

    const totalRevenue = completedAppointments.reduce((sum, apt) => sum + apt.service.price, 0);

    res.json({
      totalRevenue,
      totalAppointments: completedAppointments.length,
      data: Object.entries(grouped).map(([period, data]) => ({
        period,
        ...data
      })).sort((a, b) => a.period.localeCompare(b.period))
    });

  } catch (error) {
    console.error('Error al obtener reporte de ingresos:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener reporte de servicios
const getServicesReport = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId,
        startTime: {
          gte: start,
          lte: end
        }
      },
      include: {
        service: true
      }
    });

    // Agrupar por servicio
    const serviceStats = {};
    appointments.forEach(apt => {
      const serviceId = apt.serviceId;
      if (!serviceStats[serviceId]) {
        serviceStats[serviceId] = {
          service: apt.service,
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          totalRevenue: 0
        };
      }
      
      serviceStats[serviceId].totalAppointments += 1;
      
      switch(apt.status) {
        case 'COMPLETED':
          serviceStats[serviceId].completedAppointments += 1;
          serviceStats[serviceId].totalRevenue += apt.service.price;
          break;
        case 'CANCELLED':
          serviceStats[serviceId].cancelledAppointments += 1;
          break;
        case 'NO_SHOW':
          serviceStats[serviceId].noShowAppointments += 1;
          break;
      }
    });

    res.json({
      data: Object.values(serviceStats).sort((a, b) => b.totalRevenue - a.totalRevenue)
    });

  } catch (error) {
    console.error('Error al obtener reporte de servicios:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener reporte de clientes
const getClientsReport = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId,
        startTime: {
          gte: start,
          lte: end
        }
      },
      include: {
        client: true,
        service: true
      }
    });

    // Agrupar por cliente
    const clientStats = {};
    appointments.forEach(apt => {
      const clientId = apt.clientId;
      if (!clientStats[clientId]) {
        clientStats[clientId] = {
          client: apt.client,
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          totalSpent: 0,
          lastVisit: null
        };
      }
      
      clientStats[clientId].totalAppointments += 1;
      
      switch(apt.status) {
        case 'COMPLETED':
          clientStats[clientId].completedAppointments += 1;
          clientStats[clientId].totalSpent += apt.service.price;
          if (!clientStats[clientId].lastVisit || new Date(apt.startTime) > new Date(clientStats[clientId].lastVisit)) {
            clientStats[clientId].lastVisit = apt.startTime;
          }
          break;
        case 'CANCELLED':
          clientStats[clientId].cancelledAppointments += 1;
          break;
        case 'NO_SHOW':
          clientStats[clientId].noShowAppointments += 1;
          break;
      }
    });

    res.json({
      data: Object.values(clientStats).sort((a, b) => b.totalSpent - a.totalSpent)
    });

  } catch (error) {
    console.error('Error al obtener reporte de clientes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getDashboardMetrics,
  getRevenueReport,
  getServicesReport,
  getClientsReport
}; 