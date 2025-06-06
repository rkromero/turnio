const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener métricas generales del dashboard
const getDashboardMetrics = async (req, res) => {
  try {
    const { businessId } = req.user;
    const { period = '30' } = req.query; // días
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Ingresos totales del período
    const totalRevenue = await prisma.appointment.aggregate({
      where: {
        service: {
          businessId: parseInt(businessId)
        },
        status: 'COMPLETED',
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        id: true
      }
    });

    // Obtener ingresos reales sumando los precios de los servicios
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        service: {
          businessId: parseInt(businessId)
        },
        status: 'COMPLETED',
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        service: true
      }
    });

    const revenue = completedAppointments.reduce((sum, apt) => sum + apt.service.price, 0);

    // Citas por estado
    const appointmentsByStatus = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        service: {
          businessId: parseInt(businessId)
        },
        date: {
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
        service: {
          businessId: parseInt(businessId)
        },
        date: {
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

    // Ingresos diarios (últimos 30 días)
    const dailyRevenue = await prisma.appointment.findMany({
      where: {
        service: {
          businessId: parseInt(businessId)
        },
        status: 'COMPLETED',
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        service: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Agrupar por día
    const revenueByDay = {};
    dailyRevenue.forEach(apt => {
      const day = apt.date.toISOString().split('T')[0];
      if (!revenueByDay[day]) {
        revenueByDay[day] = 0;
      }
      revenueByDay[day] += apt.service.price;
    });

    // Horarios más demandados
    const hourlyDistribution = await prisma.appointment.findMany({
      where: {
        service: {
          businessId: parseInt(businessId)
        },
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        time: true
      }
    });

    const hourlyStats = {};
    hourlyDistribution.forEach(apt => {
      const hour = apt.time.substring(0, 2);
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    // Total de clientes únicos
    const uniqueClients = await prisma.appointment.findMany({
      where: {
        service: {
          businessId: parseInt(businessId)
        },
        date: {
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
      })),
      hourlyStats: Object.entries(hourlyStats).map(([hour, count]) => ({
        hour: `${hour}:00`,
        count
      })).sort((a, b) => a.hour.localeCompare(b.hour))
    });

  } catch (error) {
    console.error('Error al obtener métricas del dashboard:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
};

// Obtener reporte detallado de ingresos
const getRevenueReport = async (req, res) => {
  try {
    const { businessId } = req.user;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const appointments = await prisma.appointment.findMany({
      where: {
        service: {
          businessId: parseInt(businessId)
        },
        status: 'COMPLETED',
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        service: true,
        client: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Agrupar datos según el parámetro groupBy
    const groupedData = {};
    appointments.forEach(apt => {
      let key;
      const date = apt.date;
      
      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          period: key,
          revenue: 0,
          appointments: 0,
          services: {}
        };
      }

      groupedData[key].revenue += apt.service.price;
      groupedData[key].appointments += 1;
      
      if (!groupedData[key].services[apt.service.name]) {
        groupedData[key].services[apt.service.name] = 0;
      }
      groupedData[key].services[apt.service.name] += 1;
    });

    const report = Object.values(groupedData).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      report,
      summary: {
        totalRevenue: appointments.reduce((sum, apt) => sum + apt.service.price, 0),
        totalAppointments: appointments.length,
        averageRevenuePerAppointment: appointments.length > 0 
          ? appointments.reduce((sum, apt) => sum + apt.service.price, 0) / appointments.length 
          : 0
      }
    });

  } catch (error) {
    console.error('Error al obtener reporte de ingresos:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
};

// Obtener reporte de servicios
const getServicesReport = async (req, res) => {
  try {
    const { businessId } = req.user;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const servicesReport = await prisma.service.findMany({
      where: {
        businessId: parseInt(businessId)
      },
      include: {
        appointments: {
          where: {
            date: {
              gte: start,
              lte: end
            }
          }
        }
      }
    });

    const report = servicesReport.map(service => {
      const totalAppointments = service.appointments.length;
      const completedAppointments = service.appointments.filter(apt => apt.status === 'COMPLETED').length;
      const cancelledAppointments = service.appointments.filter(apt => apt.status === 'CANCELLED').length;
      const noShowAppointments = service.appointments.filter(apt => apt.status === 'NO_SHOW').length;
      const revenue = service.appointments
        .filter(apt => apt.status === 'COMPLETED')
        .reduce((sum, apt) => sum + service.price, 0);

      return {
        id: service.id,
        name: service.name,
        price: service.price,
        duration: service.duration,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments,
        revenue,
        completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments * 100).toFixed(1) : 0,
        cancellationRate: totalAppointments > 0 ? (cancelledAppointments / totalAppointments * 100).toFixed(1) : 0
      };
    });

    report.sort((a, b) => b.totalAppointments - a.totalAppointments);

    res.json({
      services: report,
      summary: {
        totalServices: report.length,
        totalRevenue: report.reduce((sum, service) => sum + service.revenue, 0),
        totalAppointments: report.reduce((sum, service) => sum + service.totalAppointments, 0),
        avgCompletionRate: report.length > 0 
          ? (report.reduce((sum, service) => sum + parseFloat(service.completionRate), 0) / report.length).toFixed(1)
          : 0
      }
    });

  } catch (error) {
    console.error('Error al obtener reporte de servicios:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
};

// Obtener reporte de clientes
const getClientsReport = async (req, res) => {
  try {
    const { businessId } = req.user;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const clientsReport = await prisma.client.findMany({
      where: {
        businessId: parseInt(businessId)
      },
      include: {
        appointments: {
          where: {
            date: {
              gte: start,
              lte: end
            }
          },
          include: {
            service: true
          }
        }
      }
    });

    const report = clientsReport.map(client => {
      const totalAppointments = client.appointments.length;
      const completedAppointments = client.appointments.filter(apt => apt.status === 'COMPLETED').length;
      const totalSpent = client.appointments
        .filter(apt => apt.status === 'COMPLETED')
        .reduce((sum, apt) => sum + apt.service.price, 0);
      
      const lastAppointment = client.appointments.length > 0 
        ? client.appointments.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
        : null;

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        totalAppointments,
        completedAppointments,
        totalSpent,
        averageSpent: completedAppointments > 0 ? totalSpent / completedAppointments : 0,
        lastAppointmentDate: lastAppointment ? lastAppointment.date : null,
        lastServiceName: lastAppointment ? lastAppointment.service.name : null
      };
    });

    // Filtrar solo clientes con citas en el período
    const activeClients = report.filter(client => client.totalAppointments > 0);
    activeClients.sort((a, b) => b.totalSpent - a.totalSpent);

    res.json({
      clients: activeClients,
      summary: {
        totalActiveClients: activeClients.length,
        totalRevenue: activeClients.reduce((sum, client) => sum + client.totalSpent, 0),
        totalAppointments: activeClients.reduce((sum, client) => sum + client.totalAppointments, 0),
        averageSpentPerClient: activeClients.length > 0 
          ? activeClients.reduce((sum, client) => sum + client.totalSpent, 0) / activeClients.length
          : 0
      }
    });

  } catch (error) {
    console.error('Error al obtener reporte de clientes:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
};

module.exports = {
  getDashboardMetrics,
  getRevenueReport,
  getServicesReport,
  getClientsReport
}; 