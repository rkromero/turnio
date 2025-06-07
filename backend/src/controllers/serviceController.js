const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todos los servicios del negocio
const getServices = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { includeInactive } = req.query;

    const where = { businessId };
    if (!includeInactive) {
      where.isActive = true;
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: services
    });

  } catch (error) {
    console.error('Error obteniendo servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nuevo servicio
const createService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { name, description, duration, price, color } = req.body;
    const businessId = req.businessId;

    const service = await prisma.service.create({
      data: {
        businessId,
        name,
        description,
        duration: parseInt(duration),
        price: parseFloat(price),
        color: color || '#10B981',
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: service
    });

  } catch (error) {
    console.error('Error creando servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar servicio
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration, price, color, isActive } = req.body;
    const businessId = req.businessId;

    // Verificar que el servicio pertenezca al negocio
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (duration) updateData.duration = parseInt(duration);
    if (price) updateData.price = parseFloat(price);
    if (color) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;

    const service = await prisma.service.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: service
    });

  } catch (error) {
    console.error('Error actualizando servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar servicio (soft delete)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    // Verificar que el servicio pertenezca al negocio
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Verificar si hay turnos futuros con este servicio
    const futureAppointments = await prisma.appointment.findFirst({
      where: {
        serviceId: id,
        startTime: {
          gte: new Date()
        },
        status: { not: 'CANCELLED' }
      }
    });

    if (futureAppointments) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el servicio porque tiene turnos programados'
      });
    }

    // Desactivar el servicio en lugar de eliminarlo
    await prisma.service.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Servicio desactivado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de servicios
const getServiceStats = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { startDate, endDate } = req.query;

    const where = { businessId };
    
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const stats = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        ...where,
        status: 'COMPLETED'
      },
      _count: {
        id: true
      },
      _sum: {
        service: {
          price: true
        }
      }
    });

    // Obtener información de los servicios
    const serviceIds = stats.map(stat => stat.serviceId);
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        businessId
      }
    });

    const serviceStatsWithDetails = stats.map(stat => {
      const service = services.find(s => s.id === stat.serviceId);
      return {
        service: {
          id: service.id,
          name: service.name,
          price: service.price
        },
        appointmentCount: stat._count.id,
        totalRevenue: stat._count.id * parseFloat(service.price)
      };
    });

    res.json({
      success: true,
      data: serviceStatsWithDetails.sort((a, b) => b.appointmentCount - a.appointmentCount)
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener servicios públicos por slug del negocio (sin autenticación)
const getPublicServices = async (req, res) => {
  try {
    const { businessSlug } = req.params;
    console.log(`🔍 Buscando servicios públicos para el negocio: ${businessSlug}`);

    // Buscar el negocio por slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug }
    });

    if (!business) {
      console.log(`❌ Negocio no encontrado con slug: ${businessSlug}`);
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    console.log(`✅ Negocio encontrado: ${business.name} (ID: ${business.id})`);

    // Obtener servicios activos del negocio
    const services = await prisma.service.findMany({
      where: {
        businessId: business.id,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        price: true,
        color: true
      }
    });

    console.log(`✅ Servicios encontrados: ${services.length}`);
    services.forEach(service => {
      console.log(`  - ${service.name} (${service.duration}min - $${service.price})`);
    });

    res.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug
      },
      services
    });

  } catch (error) {
    console.error('❌ Error obteniendo servicios públicos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getServices,
  createService,
  updateService,
  deleteService,
  getServiceStats,
  getPublicServices
}; 