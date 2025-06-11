const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener métricas del dashboard para reportes
const getDashboardMetrics = async (req, res) => {
  try {
    const { user } = req;
    const { period = 30 } = req.query;

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

    // 1. Obtener todas las citas del período
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: businessId,
        startTime: {
          gte: startDate,
          lte: endDate
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

    console.log(`📅 Encontradas ${appointments.length} citas en el período`);

    // 2. Calcular métricas básicas
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'COMPLETED');
    const revenue = completedAppointments.reduce((sum, appointment) => {
      return sum + (appointment.service?.price || 0);
    }, 0);

    // 3. Clientes únicos
    const uniqueClientEmails = new Set();
    const uniqueClientPhones = new Set();
    appointments.forEach(appointment => {
      if (appointment.clientEmail) uniqueClientEmails.add(appointment.clientEmail);
      if (appointment.clientPhone) uniqueClientPhones.add(appointment.clientPhone);
    });
    const uniqueClients = Math.max(uniqueClientEmails.size, uniqueClientPhones.size);

    // 4. Citas por estado
    const statusCounts = {};
    appointments.forEach(appointment => {
      statusCounts[appointment.status] = (statusCounts[appointment.status] || 0) + 1;
    });

    const appointmentsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));

    // 5. Servicios populares
    const serviceCounts = {};
    appointments.forEach(appointment => {
      if (appointment.service) {
        const serviceId = appointment.service.id;
        if (!serviceCounts[serviceId]) {
          serviceCounts[serviceId] = {
            serviceId,
            service: appointment.service,
            count: 0
          };
        }
        serviceCounts[serviceId].count++;
      }
    });

    const popularServices = Object.values(serviceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(service => ({
        serviceId: service.serviceId,
        _count: { id: service.count },
        service: service.service
      }));

    // 6. Ingresos diarios
    const dailyRevenue = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayAppointments = appointments.filter(appointment => {
        const appointmentDate = appointment.startTime.toISOString().split('T')[0];
        return appointmentDate === dateString && appointment.status === 'COMPLETED';
      });
      
      const dayRevenue = dayAppointments.reduce((sum, appointment) => {
        return sum + (appointment.service?.price || 0);
      }, 0);
      
      dailyRevenue.push({
        date: dateString,
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