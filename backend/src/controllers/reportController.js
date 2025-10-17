const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener métricas del dashboard para reportes
const getDashboardMetrics = async (req, res) => {
  try {
    const { user } = req;
    const { period = 30, page = 1, limit = 50 } = req.query;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const businessId = user.businessId;
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const endDate = new Date();

    console.log(`📊 Generando reportes para businessId: ${businessId}, período: ${periodDays} días`);

    // OPTIMIZACIÓN: Usar consultas agregadas en lugar de cargar todos los datos en memoria
    console.log(`📊 Generando reportes para businessId: ${businessId}, período: ${periodDays} días`);

    // 1. Obtener métricas básicas con consultas agregadas
    const [basicStats, statusStats, revenueStats, clientStats] = await Promise.all([
      // Estadísticas básicas
      prisma.appointment.aggregate({
        where: {
          businessId: businessId,
          startTime: { gte: startDate, lte: endDate }
        },
        _count: { id: true }
      }),
      
      // Citas por estado
      prisma.appointment.groupBy({
        by: ['status'],
        where: {
          businessId: businessId,
          startTime: { gte: startDate, lte: endDate }
        },
        _count: { id: true }
      }),
      
      // Ingresos totales
      prisma.appointment.findMany({
        where: {
          businessId: businessId,
          startTime: { gte: startDate, lte: endDate },
          status: 'COMPLETED'
        },
        select: {
          service: {
            select: { price: true }
          }
        }
      }),
      
      // Clientes únicos
      prisma.appointment.findMany({
        where: {
          businessId: businessId,
          startTime: { gte: startDate, lte: endDate }
        },
        select: {
          client: {
            select: { email: true, phone: true }
          }
        }
      })
    ]);

    console.log(`📅 Encontradas ${basicStats._count.id} citas en el período`);

    // 2. Procesar métricas básicas
    const totalAppointments = basicStats._count.id;
    
    // 3. Procesar estados
    const statusCounts = {};
    statusStats.forEach(stat => {
      statusCounts[stat.status] = stat._count.id;
    });
    
    const completedAppointments = statusCounts['COMPLETED'] || 0;
    
    // 4. Calcular ingresos
    const revenue = revenueStats.reduce((sum, appointment) => {
      return sum + (appointment.service?.price || 0);
    }, 0);

    // 5. Calcular clientes únicos
    const uniqueClientEmails = new Set();
    const uniqueClientPhones = new Set();
    clientStats.forEach(appointment => {
      if (appointment.client?.email) uniqueClientEmails.add(appointment.client.email);
      if (appointment.client?.phone) uniqueClientPhones.add(appointment.client.phone);
    });
    const uniqueClients = Math.max(uniqueClientEmails.size, uniqueClientPhones.size);

    // 6. Obtener servicios populares con consulta optimizada
    const popularServicesData = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        businessId: businessId,
        startTime: { gte: startDate, lte: endDate }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    });

    // Obtener detalles de servicios
    const serviceIds = popularServicesData.map(s => s.serviceId);
    const servicesDetails = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, price: true }
    });

    const popularServices = popularServicesData.map(serviceData => ({
      serviceId: serviceData.serviceId,
      _count: { id: serviceData._count.id },
      service: servicesDetails.find(s => s.id === serviceData.serviceId)
    }));

    // 7. Ingresos diarios con consulta optimizada
    const dailyRevenue = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const dayRevenueData = await prisma.appointment.findMany({
        where: {
          businessId: businessId,
          startTime: { gte: startOfDay, lte: endOfDay },
          status: 'COMPLETED'
        },
        select: {
          service: { select: { price: true } }
        }
      });
      
      const dayRevenue = dayRevenueData.reduce((sum, appointment) => {
        return sum + (appointment.service?.price || 0);
      }, 0);
      
      dailyRevenue.push({
        date: date.toISOString().split('T')[0],
        amount: dayRevenue
      });
    }

    // 7. Estadísticas por hora
    const hourlyCounts = {};
    appointments.forEach(appointment => {
      const hour = appointment.startTime.getHours();
      const hourString = `${hour.toString().padStart(2, '0')}:00`;
      hourlyCounts[hourString] = (hourlyCounts[hourString] || 0) + 1;
    });

    const hourlyStats = Object.entries(hourlyCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    const metrics = {
      period: periodDays,
      revenue,
      totalAppointments,
      uniqueClients,
      appointmentsByStatus,
      popularServices,
      dailyRevenue,
      hourlyStats
    };

    console.log(`✅ Métricas calculadas:`, {
      revenue,
      totalAppointments,
      uniqueClients,
      statusCount: appointmentsByStatus.length,
      popularServicesCount: popularServices.length,
      dailyRevenueCount: dailyRevenue.length,
      hourlyStatsCount: hourlyStats.length
    });

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Error obteniendo métricas del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener reporte de ingresos
const getRevenueReport = async (req, res) => {
  try {
    const { user } = req;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const businessId = user.businessId;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId,
        startTime: {
          gte: start,
          lte: end
        },
        status: 'COMPLETED'
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      }
    });

    const totalRevenue = appointments.reduce((sum, appointment) => {
      return sum + (appointment.service?.price || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        appointmentCount: appointments.length,
        averageTicket: appointments.length > 0 ? totalRevenue / appointments.length : 0,
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo reporte de ingresos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener reporte de servicios
const getServicesReport = async (req, res) => {
  try {
    const { user } = req;
    const { startDate, endDate } = req.query;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const businessId = user.businessId;
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
        service: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      }
    });

    const serviceStats = {};
    appointments.forEach(appointment => {
      if (appointment.service) {
        const serviceId = appointment.service.id;
        if (!serviceStats[serviceId]) {
          serviceStats[serviceId] = {
            service: appointment.service,
            totalBookings: 0,
            completedBookings: 0,
            revenue: 0
          };
        }
        serviceStats[serviceId].totalBookings++;
        if (appointment.status === 'COMPLETED') {
          serviceStats[serviceId].completedBookings++;
          serviceStats[serviceId].revenue += appointment.service.price;
        }
      }
    });

    const servicesData = Object.values(serviceStats);

    res.json({
      success: true,
      data: {
        services: servicesData,
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo reporte de servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener reporte de clientes
const getClientsReport = async (req, res) => {
  try {
    const { user } = req;
    const { startDate, endDate } = req.query;

    if (!user || !user.businessId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const businessId = user.businessId;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId,
        startTime: {
          gte: start,
          lte: end
        }
      }
    });

    const clientStats = {};
    appointments.forEach(appointment => {
      const clientKey = appointment.clientEmail || appointment.clientPhone || 'anonymous';
      if (!clientStats[clientKey]) {
        clientStats[clientKey] = {
          clientName: appointment.clientName,
          clientEmail: appointment.clientEmail,
          clientPhone: appointment.clientPhone,
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          noShowBookings: 0
        };
      }
      clientStats[clientKey].totalBookings++;
      switch (appointment.status) {
        case 'COMPLETED':
          clientStats[clientKey].completedBookings++;
          break;
        case 'CANCELLED':
          clientStats[clientKey].cancelledBookings++;
          break;
        case 'NO_SHOW':
          clientStats[clientKey].noShowBookings++;
          break;
      }
    });

    const clientsData = Object.values(clientStats);
    const uniqueClients = clientsData.length;
    const returningClients = clientsData.filter(client => client.totalBookings > 1).length;

    res.json({
      success: true,
      data: {
        uniqueClients,
        returningClients,
        clientRetentionRate: uniqueClients > 0 ? (returningClients / uniqueClients) * 100 : 0,
        clients: clientsData.sort((a, b) => b.totalBookings - a.totalBookings),
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo reporte de clientes:', error);
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