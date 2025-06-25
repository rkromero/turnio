const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');
const { getActiveBranchIds, getMainBranch } = require('../utils/branchUtils');

// Obtener todos los servicios del negocio
const getServices = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { includeInactive, branchId, includeGlobal = 'true' } = req.query;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    const where = { businessId };
    if (!includeInactive) {
      where.isActive = true;
    }

    // Obtener servicios globales
    let services = [];
    if (includeGlobal === 'true') {
      const globalServices = await prisma.service.findMany({
        where: {
          ...where,
          isGlobal: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      services = globalServices.map(service => ({
        ...service,
        serviceType: 'global',
        branchPrice: null
      }));
    }

    // Si se especifica una sucursal, obtener servicios específicos
    if (branchId && branchIds.includes(branchId)) {
      const branchServices = await prisma.branchService.findMany({
        where: {
          branchId,
          isActive: true
        },
        include: {
          service: true
        }
      });

      const specificServices = branchServices.map(bs => ({
        ...bs.service,
        serviceType: 'specific',
        branchPrice: bs.price,
        originalPrice: bs.service.price,
        price: bs.price || bs.service.price // Override price if set
      }));

      services = [...services, ...specificServices];
    }

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

    const { name, description, duration, price, color, isGlobal = true, branchIds = [] } = req.body;
    const businessId = req.businessId;

    // Obtener sucursales activas
    const activeBranchIds = await getActiveBranchIds(businessId);

    // Verificar límites del plan
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { planType: true }
    });

    const activeServicesCount = await prisma.service.count({
      where: { businessId, isActive: true }
    });

    // Usar los límites del planController
    const { AVAILABLE_PLANS } = require('./planController');
    const serviceLimit = AVAILABLE_PLANS[business.planType].limits.services;
    
    if (serviceLimit !== -1 && activeServicesCount >= serviceLimit) {
      return res.status(400).json({
        success: false,
        message: `No puedes crear más servicios en el Plan ${business.planType}`,
        error: 'PLAN_LIMIT_EXCEEDED',
        details: {
          currentPlan: business.planType,
          currentServices: activeServicesCount,
          maxServices: serviceLimit,
          nextPlan: business.planType === 'FREE' ? 'BASIC' : business.planType === 'BASIC' ? 'PREMIUM' : 'ENTERPRISE',
          nextPlanServices: business.planType === 'FREE' ? 10 : business.planType === 'BASIC' ? 25 : -1,
          upgradeRequired: true,
          feature: 'services'
        }
      });
    }

    // Crear el servicio
    const service = await prisma.service.create({
      data: {
        businessId,
        name,
        description,
        duration: parseInt(duration),
        price: parseFloat(price),
        color: color || '#10B981',
        isGlobal: Boolean(isGlobal),
        isActive: true
      }
    });

    // Si no es global, asignar a sucursales específicas
    if (!isGlobal && branchIds.length > 0) {
      const validBranchIds = branchIds.filter(id => activeBranchIds.includes(id));
      
      if (validBranchIds.length > 0) {
        const branchServiceData = validBranchIds.map(branchId => ({
          branchId,
          serviceId: service.id,
          isActive: true
        }));

        await prisma.branchService.createMany({
          data: branchServiceData
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: {
        ...service,
        serviceType: isGlobal ? 'global' : 'specific',
        assignedBranches: isGlobal ? activeBranchIds : branchIds.filter(id => activeBranchIds.includes(id))
      }
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
    const { name, description, duration, price, color, isActive, isGlobal, branchIds = [] } = req.body;
    const businessId = req.businessId;

    // Obtener sucursales activas
    const activeBranchIds = await getActiveBranchIds(businessId);

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
    if (isGlobal !== undefined) updateData.isGlobal = Boolean(isGlobal);

    const service = await prisma.service.update({
      where: { id },
      data: updateData
    });

    // Si cambió de global a específico o se actualizaron las sucursales
    if (isGlobal !== undefined || branchIds.length > 0) {
      if (!service.isGlobal) {
        // Eliminar asignaciones existentes
        await prisma.branchService.deleteMany({
          where: { serviceId: id }
        });

        // Crear nuevas asignaciones
        const validBranchIds = branchIds.filter(branchId => activeBranchIds.includes(branchId));
        if (validBranchIds.length > 0) {
          const branchServiceData = validBranchIds.map(branchId => ({
            branchId,
            serviceId: service.id,
            isActive: true
          }));

          await prisma.branchService.createMany({
            data: branchServiceData
          });
        }
      } else {
        // Si cambió a global, eliminar asignaciones específicas
        await prisma.branchService.deleteMany({
          where: { serviceId: id }
        });
      }
    }

    res.json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: {
        ...service,
        serviceType: service.isGlobal ? 'global' : 'specific'
      }
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

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

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

    // Verificar si hay turnos futuros con este servicio en sucursales activas
    const futureAppointments = await prisma.appointment.findFirst({
      where: {
        serviceId: id,
        branchId: { in: branchIds },
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

    // También desactivar asignaciones específicas por sucursal
    await prisma.branchService.updateMany({
      where: { serviceId: id },
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

// Obtener servicios específicos de una sucursal con precios
const getServicesByBranch = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { branchId } = req.params;
    const { includeGlobal = 'true' } = req.query;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    if (!branchIds.includes(branchId)) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada o inactiva'
      });
    }

    let services = [];

    // Servicios globales
    if (includeGlobal === 'true') {
      const globalServices = await prisma.service.findMany({
        where: {
          businessId,
          isGlobal: true,
          isActive: true
        },
        orderBy: { name: 'asc' }
      });

      services = globalServices.map(service => ({
        ...service,
        serviceType: 'global',
        branchPrice: null,
        isAvailableInBranch: true
      }));
    }

    // Servicios específicos de la sucursal
    const branchServices = await prisma.branchService.findMany({
      where: {
        branchId,
        isActive: true
      },
      include: {
        service: {
          where: { isActive: true }
        }
      }
    });

    const specificServices = branchServices
      .filter(bs => bs.service) // Solo incluir si el servicio está activo
      .map(bs => ({
        ...bs.service,
        serviceType: 'specific',
        branchPrice: bs.price,
        originalPrice: bs.service.price,
        price: bs.price || bs.service.price,
        isAvailableInBranch: true,
        branchServiceId: bs.id
      }));

    services = [...services, ...specificServices];

    res.json({
      success: true,
      data: {
        branchId,
        services: services.sort((a, b) => a.name.localeCompare(b.name))
      }
    });

  } catch (error) {
    console.error('Error obteniendo servicios de sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Asignar servicio específico a sucursal
const assignServiceToBranch = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { branchId, serviceId } = req.params;
    const { price } = req.body;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    if (!branchIds.includes(branchId)) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada o inactiva'
      });
    }

    // Verificar que el servicio pertenece al negocio
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        businessId,
        isActive: true
      }
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // No permitir asignar servicios globales
    if (service.isGlobal) {
      return res.status(400).json({
        success: false,
        message: 'Los servicios globales están disponibles en todas las sucursales automáticamente'
      });
    }

    // Crear o actualizar asignación
    const branchService = await prisma.branchService.upsert({
      where: {
        branchId_serviceId: {
          branchId,
          serviceId
        }
      },
      update: {
        price: price ? parseFloat(price) : null,
        isActive: true
      },
      create: {
        branchId,
        serviceId,
        price: price ? parseFloat(price) : null,
        isActive: true
      },
      include: {
        service: true
      }
    });

    res.json({
      success: true,
      message: 'Servicio asignado a sucursal exitosamente',
      data: {
        ...branchService.service,
        branchPrice: branchService.price,
        finalPrice: branchService.price || branchService.service.price,
        branchServiceId: branchService.id
      }
    });

  } catch (error) {
    console.error('Error asignando servicio a sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar precio específico de servicio en sucursal
const updateBranchServicePrice = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { branchId, serviceId } = req.params;
    const { price } = req.body;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    if (!branchIds.includes(branchId)) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada o inactiva'
      });
    }

    // Verificar que existe la asignación
    const branchService = await prisma.branchService.findFirst({
      where: {
        branchId,
        serviceId,
        isActive: true
      },
      include: {
        service: {
          where: { businessId }
        }
      }
    });

    if (!branchService || !branchService.service) {
      return res.status(404).json({
        success: false,
        message: 'Asignación de servicio no encontrada'
      });
    }

    // Actualizar precio
    const updatedBranchService = await prisma.branchService.update({
      where: {
        branchId_serviceId: {
          branchId,
          serviceId
        }
      },
      data: {
        price: price ? parseFloat(price) : null
      },
      include: {
        service: true
      }
    });

    res.json({
      success: true,
      message: 'Precio actualizado exitosamente',
      data: {
        ...updatedBranchService.service,
        branchPrice: updatedBranchService.price,
        finalPrice: updatedBranchService.price || updatedBranchService.service.price,
        originalPrice: updatedBranchService.service.price
      }
    });

  } catch (error) {
    console.error('Error actualizando precio de servicio en sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Remover servicio específico de sucursal
const removeBranchService = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { branchId, serviceId } = req.params;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    if (!branchIds.includes(branchId)) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada o inactiva'
      });
    }

    // Verificar que existe la asignación
    const branchService = await prisma.branchService.findFirst({
      where: {
        branchId,
        serviceId,
        isActive: true
      }
    });

    if (!branchService) {
      return res.status(404).json({
        success: false,
        message: 'Asignación de servicio no encontrada'
      });
    }

    // Verificar si hay citas futuras con este servicio en esta sucursal
    const futureAppointments = await prisma.appointment.count({
      where: {
        serviceId,
        branchId,
        startTime: {
          gt: new Date()
        },
        status: { not: 'CANCELLED' }
      }
    });

    if (futureAppointments > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede remover el servicio. Hay ${futureAppointments} citas futuras programadas en esta sucursal.`
      });
    }

    // Desactivar la asignación
    await prisma.branchService.update({
      where: {
        branchId_serviceId: {
          branchId,
          serviceId
        }
      },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Servicio removido de la sucursal exitosamente'
    });

  } catch (error) {
    console.error('Error removiendo servicio de sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de servicios por sucursal
const getBranchServiceStats = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { branchId } = req.params;
    const { startDate, endDate } = req.query;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    if (!branchIds.includes(branchId)) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada o inactiva'
      });
    }

    const where = {
      branchId,
      status: 'COMPLETED'
    };
    
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Estadísticas por servicio
    const serviceStats = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where,
      _count: {
        id: true
      },
      _avg: {
        service: {
          price: true
        }
      }
    });

    // Obtener información de servicios
    const serviceIds = serviceStats.map(stat => stat.serviceId);
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        businessId
      }
    });

    // Obtener precios específicos de sucursal
    const branchServices = await prisma.branchService.findMany({
      where: {
        branchId,
        serviceId: { in: serviceIds },
        isActive: true
      }
    });

    const statsWithDetails = serviceStats.map(stat => {
      const service = services.find(s => s.id === stat.serviceId);
      const branchService = branchServices.find(bs => bs.serviceId === stat.serviceId);
      const finalPrice = branchService?.price || service.price;

      return {
        service: {
          id: service.id,
          name: service.name,
          basePrice: service.price,
          branchPrice: branchService?.price,
          finalPrice: finalPrice,
          isGlobal: service.isGlobal
        },
        appointmentCount: stat._count.id,
        totalRevenue: stat._count.id * parseFloat(finalPrice)
      };
    });

    res.json({
      success: true,
      data: {
        branchId,
        period: { startDate, endDate },
        services: statsWithDetails.sort((a, b) => b.appointmentCount - a.appointmentCount),
        totalRevenue: statsWithDetails.reduce((sum, stat) => sum + stat.totalRevenue, 0),
        totalAppointments: statsWithDetails.reduce((sum, stat) => sum + stat.appointmentCount, 0)
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de servicios por sucursal:', error);
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
  getPublicServices,
  // Nuevas funciones para gestión multi-sucursal
  getServicesByBranch,
  assignServiceToBranch,
  updateBranchServicePrice,
  removeBranchService,
  getBranchServiceStats
}; 