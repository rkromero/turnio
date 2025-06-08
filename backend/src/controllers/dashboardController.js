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

    // Obtener todas las sucursales activas del negocio para incluir en las consultas
    const activeBranches = await prisma.branch.findMany({
      where: {
        businessId,
        isActive: true
      },
      select: { id: true }
    });

    const branchIds = activeBranches.map(branch => branch.id);

    // Si no hay sucursales, crear una automáticamente
    if (branchIds.length === 0) {
      console.log('🔄 Creando sucursal principal automáticamente para businessId:', businessId);
      
      const business = await prisma.business.findUnique({
        where: { id: businessId }
      });

      if (business) {
        const newBranch = await prisma.branch.create({
          data: {
            businessId,
            name: business.name + ' - Principal',
            slug: 'principal',
            address: business.address,
            phone: business.phone,
            description: 'Sucursal principal (creada automáticamente)',
            isMain: true,
            isActive: true
          }
        });
        branchIds.push(newBranch.id);
      }
    }

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
          branchId: { in: branchIds },
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
          branchId: { in: branchIds },
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

      // Total de servicios activos (globales + específicos de sucursales)
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
          branchId: { in: branchIds },
          startTime: { gte: new Date() },
          status: { not: 'CANCELLED' }
        },
        include: {
          client: {
            select: { 
              name: true,
              email: true,
              phone: true
            }
          },
          service: {
            select: { name: true }
          },
          branch: {
            select: { 
              name: true,
              isMain: true 
            }
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
          clientEmail: appointment.client.email,
          clientPhone: appointment.client.phone,
          serviceName: appointment.service.name,
          branchName: appointment.branch.name,
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