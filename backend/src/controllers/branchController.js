const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todas las sucursales del negocio
const getBranches = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { includeInactive } = req.query;

    let whereClause = { businessId };
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    const branches = await prisma.branch.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            appointments: {
              where: {
                startTime: {
                  gte: new Date()
                }
              }
            }
          }
        }
      },
      orderBy: [
        { isMain: 'desc' }, // Principal primero
        { createdAt: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: branches
    });

  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener una sucursal por ID
const getBranchById = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { branchId } = req.params;

    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        businessId
      },
      include: {
        business: {
          select: {
            name: true,
            planType: true
          }
        },
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                description: true,
                duration: true,
                price: true,
                color: true,
                isGlobal: true
              }
            }
          }
        },
        _count: {
          select: {
            appointments: {
              where: {
                startTime: {
                  gte: new Date()
                }
              }
            }
          }
        }
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    res.json({
      success: true,
      data: branch
    });

  } catch (error) {
    console.error('Error obteniendo sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nueva sucursal
const createBranch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const businessId = req.businessId;
    const { 
      name, 
      slug, 
      address, 
      phone, 
      description, 
      banner,
      bannerAlt,
      isMain,
      latitude,
      longitude,
      timezone 
    } = req.body;

    // Verificar que el plan permite múltiples sucursales
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { planType: true }
    });

    if (business.planType !== 'ENTERPRISE') {
      return res.status(403).json({
        success: false,
        message: 'Tu plan actual no permite múltiples sucursales. Actualiza al plan Empresarial.'
      });
    }

    // Si es sucursal principal, desmarcar otras
    if (isMain) {
      await prisma.branch.updateMany({
        where: { businessId },
        data: { isMain: false }
      });
    }

    // Verificar que el slug sea único para este negocio
    const existingBranch = await prisma.branch.findFirst({
      where: {
        businessId,
        slug
      }
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una sucursal con este identificador'
      });
    }

    const branch = await prisma.branch.create({
      data: {
        businessId,
        name,
        slug,
        address,
        phone,
        description,
        banner,
        bannerAlt,
        isMain: isMain || false,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        timezone: timezone || 'America/Argentina/Buenos_Aires'
      }
    });

    // Si es la primera sucursal, marcarla como principal
    const branchCount = await prisma.branch.count({
      where: { businessId }
    });

    if (branchCount === 1) {
      await prisma.branch.update({
        where: { id: branch.id },
        data: { isMain: true }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Sucursal creada exitosamente',
      data: branch
    });

  } catch (error) {
    console.error('Error creando sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar sucursal
const updateBranch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const businessId = req.businessId;
    const { branchId } = req.params;
    const { 
      name, 
      slug, 
      address, 
      phone, 
      description, 
      banner,
      bannerAlt,
      isMain,
      isActive,
      latitude,
      longitude,
      timezone 
    } = req.body;

    // Verificar que la sucursal pertenece al negocio
    const existingBranch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        businessId
      }
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Si el slug cambió, verificar que sea único
    if (slug && slug !== existingBranch.slug) {
      const slugExists = await prisma.branch.findFirst({
        where: {
          businessId,
          slug,
          id: { not: branchId }
        }
      });

      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una sucursal con este identificador'
        });
      }
    }

    // Si se marca como principal, desmarcar otras
    if (isMain && !existingBranch.isMain) {
      await prisma.branch.updateMany({
        where: { 
          businessId,
          id: { not: branchId }
        },
        data: { isMain: false }
      });
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(description !== undefined && { description }),
        ...(banner !== undefined && { banner }),
        ...(bannerAlt !== undefined && { bannerAlt }),
        ...(isMain !== undefined && { isMain }),
        ...(isActive !== undefined && { isActive }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(timezone && { timezone })
      }
    });

    res.json({
      success: true,
      message: 'Sucursal actualizada exitosamente',
      data: updatedBranch
    });

  } catch (error) {
    console.error('Error actualizando sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar sucursal (soft delete)
const deleteBranch = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { branchId } = req.params;

    // Verificar que la sucursal pertenece al negocio
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        businessId
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // No permitir eliminar la sucursal principal si hay otras activas
    if (branch.isMain) {
      const otherActiveBranches = await prisma.branch.count({
        where: {
          businessId,
          id: { not: branchId },
          isActive: true
        }
      });

      if (otherActiveBranches > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar la sucursal principal. Primero marca otra como principal.'
        });
      }
    }

    // Verificar si hay citas futuras
    const futureAppointments = await prisma.appointment.count({
      where: {
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
        message: `No se puede eliminar la sucursal. Hay ${futureAppointments} citas futuras programadas.`
      });
    }

    // Soft delete - marcar como inactiva
    await prisma.branch.update({
      where: { id: branchId },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Sucursal eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener servicios de una sucursal
const getBranchServices = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { branchId } = req.params;

    // Verificar que la sucursal pertenece al negocio
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        businessId
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Obtener servicios globales del negocio
    const globalServices = await prisma.service.findMany({
      where: {
        businessId,
        isGlobal: true,
        isActive: true
      }
    });

    // Obtener servicios específicos de la sucursal
    const branchServices = await prisma.branchService.findMany({
      where: {
        branchId,
        isActive: true
      },
      include: {
        service: true
      }
    });

    // Combinar servicios
    const allServices = [
      ...globalServices.map(service => ({
        ...service,
        isGlobal: true,
        branchPrice: null
      })),
      ...branchServices.map(bs => ({
        ...bs.service,
        isGlobal: false,
        branchPrice: bs.price,
        price: bs.price || bs.service.price
      }))
    ];

    res.json({
      success: true,
      data: allServices
    });

  } catch (error) {
    console.error('Error obteniendo servicios de sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Asignar servicio a sucursal
const assignServiceToBranch = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { branchId } = req.params;
    const { serviceId, price } = req.body;

    // Verificar que la sucursal y el servicio pertenecen al negocio
    const [branch, service] = await Promise.all([
      prisma.branch.findFirst({
        where: { id: branchId, businessId }
      }),
      prisma.service.findFirst({
        where: { id: serviceId, businessId }
      })
    ]);

    if (!branch || !service) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal o servicio no encontrado'
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
        price: price ? parseFloat(price) : null
      }
    });

    res.json({
      success: true,
      message: 'Servicio asignado a sucursal exitosamente',
      data: branchService
    });

  } catch (error) {
    console.error('Error asignando servicio a sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchServices,
  assignServiceToBranch
}; 