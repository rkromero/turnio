const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { getActiveBranchIds, getMainBranch } = require('../utils/branchUtils');

// Obtener todos los usuarios/empleados del negocio
const getUsers = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { includeInactive, search, role, branchId } = req.query;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    let whereClause = { 
      businessId,
      branchId: { in: branchIds }
    };

    // Filtrar por sucursal específica
    if (branchId && branchIds.includes(branchId)) {
      whereClause.branchId = branchId;
    }

    // Filtrar por estado activo/inactivo
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    // Filtrar por rol
    if (role && ['ADMIN', 'EMPLOYEE'].includes(role)) {
      whereClause.role = role;
    }

    // Búsqueda por nombre o email
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        phone: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            isMain: true
          }
        },
        workingHours: {
          orderBy: { dayOfWeek: 'asc' }
        },
        _count: {
          select: {
            appointments: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // ADMIN primero
        { name: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener un usuario específico
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    const user = await prisma.user.findFirst({
      where: { 
        id, 
        businessId,
        branchId: { in: branchIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        phone: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            isMain: true
          }
        },
        workingHours: {
          orderBy: { dayOfWeek: 'asc' }
        },
        appointments: {
          take: 10,
          orderBy: { startTime: 'desc' },
          include: {
            client: { select: { name: true } },
            service: { select: { name: true } },
            branch: { select: { name: true } }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nuevo empleado
const createUser = async (req, res) => {
  try {
    console.log('📥 Datos recibidos para crear usuario:', {
      body: req.body,
      email: req.body.email,
      role: req.body.role,
      avatar: req.body.avatar
    });

    const businessId = req.businessId;
    const { name, email, password, role, phone, avatar, branchId } = req.body;

    // Validaciones básicas
    if (!name || !email || !password) {
      console.log('⚠️ Faltan campos requeridos');
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, email y contraseña son requeridos'
      });
    }

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);
    
    // Determinar la sucursal (usar la especificada o la principal)
    let targetBranchId = branchId;
    if (!targetBranchId || !branchIds.includes(targetBranchId)) {
      const mainBranch = await getMainBranch(businessId);
      targetBranchId = mainBranch?.id || branchIds[0];
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        businessId
      }
    });

    if (existingUser) {
      console.log('⚠️ Email ya existe en el negocio');
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con este email en tu negocio'
      });
    }

    // Verificar límites del plan
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { planType: true }
    });

    const activeUsersCount = await prisma.user.count({
      where: { 
        businessId, 
        isActive: true,
        branchId: { in: branchIds }
      }
    });

    // Usar los límites del planController
    const { AVAILABLE_PLANS } = require('./planController');
    const userLimit = AVAILABLE_PLANS[business.planType].limits.users;
    
    if (userLimit !== -1 && activeUsersCount >= userLimit) {
      console.log(`⚠️ Límite de usuarios alcanzado: ${activeUsersCount}/${userLimit}`);
      return res.status(400).json({
        success: false,
        message: `Has alcanzado el límite de usuarios de tu plan ${business.planType} (${userLimit} usuarios). Considera actualizar tu plan.`
      });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        businessId,
        branchId: targetBranchId,
        name,
        email,
        password: hashedPassword,
        role: role || 'EMPLOYEE',
        phone,
        avatar,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        phone: true,
        branchId: true,
        createdAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            isMain: true
          }
        }
      }
    });

    console.log('✅ Usuario creado exitosamente:', { 
      id: user.id, 
      email: user.email,
      branchId: user.branchId 
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: user
    });

  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar usuario
const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const businessId = req.businessId;
    const { name, email, role, phone, avatar, password, branchId } = req.body;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    // Verificar que el usuario existe y pertenece al negocio y sucursal activa
    const existingUser = await prisma.user.findFirst({
      where: { 
        id, 
        businessId,
        branchId: { in: branchIds }
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar email único si se está cambiando
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: { 
          email,
          businessId,
          id: { not: id }
        }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro usuario con este email'
        });
      }
    }

    // Preparar datos de actualización
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    
    // Actualizar sucursal si se especifica y es válida
    if (branchId && branchIds.includes(branchId)) {
      updateData.branchId = branchId;
    }

    // Hashear nueva contraseña si se proporciona
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        phone: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            isMain: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Este email ya está en uso'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Activar/desactivar usuario
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;
    const { isActive } = req.body;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    const user = await prisma.user.findFirst({
      where: { 
        id, 
        businessId,
        branchId: { in: branchIds }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir desactivar el último admin
    if (!isActive && user.role === 'ADMIN') {
      const activeAdmins = await prisma.user.count({
        where: { 
          businessId, 
          role: 'ADMIN', 
          isActive: true,
          branchId: { in: branchIds },
          id: { not: id }
        }
      });

      if (activeAdmins === 0) {
        return res.status(400).json({
          success: false,
          message: 'No puedes desactivar el último administrador'
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        phone: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            isMain: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: updatedUser
    });

  } catch (error) {
    console.error('Error cambiando estado del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar usuario (soft delete)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    const user = await prisma.user.findFirst({
      where: { 
        id, 
        businessId,
        branchId: { in: branchIds }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir eliminar el último admin
    if (user.role === 'ADMIN') {
      const activeAdmins = await prisma.user.count({
        where: { 
          businessId, 
          role: 'ADMIN', 
          isActive: true,
          branchId: { in: branchIds },
          id: { not: id }
        }
      });

      if (activeAdmins === 0) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar el último administrador'
        });
      }
    }

    // Verificar si tiene citas futuras
    const futureAppointments = await prisma.appointment.count({
      where: {
        userId: id,
        branchId: { in: branchIds },
        startTime: {
          gt: new Date()
        },
        status: { not: 'CANCELLED' }
      }
    });

    if (futureAppointments > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el usuario. Tiene ${futureAppointments} citas futuras programadas.`
      });
    }

    // Soft delete - marcar como inactivo
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de usuarios
const getUserStats = async (req, res) => {
  try {
    const businessId = req.businessId;

    const [
      totalUsers,
      activeUsers,
      adminUsers,
      employeeUsers,
      recentUsers
    ] = await Promise.all([
      prisma.user.count({ where: { businessId } }),
      prisma.user.count({ where: { businessId, isActive: true } }),
      prisma.user.count({ where: { businessId, role: 'ADMIN', isActive: true } }),
      prisma.user.count({ where: { businessId, role: 'EMPLOYEE', isActive: true } }),
      prisma.user.count({
        where: {
          businessId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        }
      })
    ]);

    // Estadísticas por usuario (citas completadas, etc.)
    const userPerformance = await prisma.user.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        _count: {
          select: {
            appointments: {
              where: { status: 'COMPLETED' }
            }
          }
        }
      },
      orderBy: {
        appointments: {
          _count: 'desc'
        }
      },
      take: 5
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          adminUsers,
          employeeUsers,
          recentUsers
        },
        topPerformers: userPerformance
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserStats
}; 