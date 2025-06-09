const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener horarios de descanso de una sucursal
const getBranchBreakTimes = async (req, res) => {
  try {
    const { branchId } = req.params;
    const businessId = req.businessId;

    // Verificar que la sucursal pertenece al negocio
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        businessId: businessId
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Obtener horarios de descanso
    const breakTimes = await prisma.branchBreakTime.findMany({
      where: {
        branchId: branchId,
        isActive: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: {
        branch: {
          id: branch.id,
          name: branch.name,
          slug: branch.slug
        },
        breakTimes
      }
    });

  } catch (error) {
    console.error('Error obteniendo horarios de descanso:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener horarios de descanso de todas las sucursales del negocio
const getAllBranchBreakTimes = async (req, res) => {
  try {
    const businessId = req.businessId;

    const branches = await prisma.branch.findMany({
      where: {
        businessId: businessId,
        isActive: true
      },
      include: {
        breakTimes: {
          where: { isActive: true },
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: branches
    });

  } catch (error) {
    console.error('Error obteniendo horarios de descanso de todas las sucursales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear horario de descanso
const createBreakTime = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { branchId } = req.params;
    const { dayOfWeek, startTime, endTime, name } = req.body;
    const businessId = req.businessId;

    // Verificar que la sucursal pertenece al negocio
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        businessId: businessId
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
      });
    }

    // Verificar que no haya conflictos de horarios
    const conflictingBreakTime = await prisma.branchBreakTime.findFirst({
      where: {
        branchId: branchId,
        dayOfWeek: dayOfWeek,
        isActive: true,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    });

    if (conflictingBreakTime) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un horario de descanso que se superpone con el horario especificado'
      });
    }

    const breakTime = await prisma.branchBreakTime.create({
      data: {
        branchId,
        dayOfWeek,
        startTime,
        endTime,
        name: name || 'Descanso',
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Horario de descanso creado exitosamente',
      data: breakTime
    });

  } catch (error) {
    console.error('Error creando horario de descanso:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar horario de descanso
const updateBreakTime = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { breakTimeId } = req.params;
    const { dayOfWeek, startTime, endTime, name, isActive } = req.body;
    const businessId = req.businessId;

    // Verificar que el horario de descanso existe y pertenece al negocio
    const existingBreakTime = await prisma.branchBreakTime.findFirst({
      where: {
        id: breakTimeId,
        branch: {
          businessId: businessId
        }
      },
      include: {
        branch: true
      }
    });

    if (!existingBreakTime) {
      return res.status(404).json({
        success: false,
        message: 'Horario de descanso no encontrado'
      });
    }

    // Si se están actualizando horarios, verificar conflictos
    if (dayOfWeek !== undefined || startTime !== undefined || endTime !== undefined) {
      const newDayOfWeek = dayOfWeek !== undefined ? dayOfWeek : existingBreakTime.dayOfWeek;
      const newStartTime = startTime !== undefined ? startTime : existingBreakTime.startTime;
      const newEndTime = endTime !== undefined ? endTime : existingBreakTime.endTime;

      const conflictingBreakTime = await prisma.branchBreakTime.findFirst({
        where: {
          id: { not: breakTimeId },
          branchId: existingBreakTime.branchId,
          dayOfWeek: newDayOfWeek,
          isActive: true,
          OR: [
            {
              AND: [
                { startTime: { lte: newStartTime } },
                { endTime: { gt: newStartTime } }
              ]
            },
            {
              AND: [
                { startTime: { lt: newEndTime } },
                { endTime: { gte: newEndTime } }
              ]
            },
            {
              AND: [
                { startTime: { gte: newStartTime } },
                { endTime: { lte: newEndTime } }
              ]
            }
          ]
        }
      });

      if (conflictingBreakTime) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un horario de descanso que se superpone con el horario especificado'
        });
      }
    }

    const updatedBreakTime = await prisma.branchBreakTime.update({
      where: { id: breakTimeId },
      data: {
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      success: true,
      message: 'Horario de descanso actualizado exitosamente',
      data: updatedBreakTime
    });

  } catch (error) {
    console.error('Error actualizando horario de descanso:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar horario de descanso
const deleteBreakTime = async (req, res) => {
  try {
    const { breakTimeId } = req.params;
    const businessId = req.businessId;

    // Verificar que el horario de descanso existe y pertenece al negocio
    const existingBreakTime = await prisma.branchBreakTime.findFirst({
      where: {
        id: breakTimeId,
        branch: {
          businessId: businessId
        }
      }
    });

    if (!existingBreakTime) {
      return res.status(404).json({
        success: false,
        message: 'Horario de descanso no encontrado'
      });
    }

    await prisma.branchBreakTime.delete({
      where: { id: breakTimeId }
    });

    res.json({
      success: true,
      message: 'Horario de descanso eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando horario de descanso:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getBranchBreakTimes,
  getAllBranchBreakTimes,
  createBreakTime,
  updateBreakTime,
  deleteBreakTime
}; 