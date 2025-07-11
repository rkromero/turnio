const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener configuración general del negocio
const getBusinessConfig = async (req, res) => {
  try {
    const businessId = req.businessId;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        planType: true,
        maxAppointments: true,
        logo: true,
        phone: true,
        address: true,
        description: true,
        primaryColor: true,
        businessType: true,
        defaultAppointmentDuration: true,
        createdAt: true,
        updatedAt: true,
        users: {
          where: { role: 'ADMIN', isActive: true },
          select: { name: true },
          take: 1
        }
      }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    // Obtener el nombre del profesional principal (usuario admin)
    const professionalName = business.users[0]?.name || null;

    res.json({
      success: true,
      data: {
        ...business,
        professionalName,
        users: undefined // Remover users del resultado final
      }
    });

  } catch (error) {
    console.error('Error obteniendo configuración del negocio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar configuración del negocio
const updateBusinessConfig = async (req, res) => {
  try {
    // Logging temporal para depuración
    console.log('=== DATOS RECIBIDOS ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('businessType:', req.body.businessType, typeof req.body.businessType);
    console.log('defaultAppointmentDuration:', req.body.defaultAppointmentDuration, typeof req.body.defaultAppointmentDuration);
    console.log('professionalName:', req.body.professionalName, typeof req.body.professionalName);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('=== ERRORES DE VALIDACIÓN ===');
      console.log(JSON.stringify(errors.array(), null, 2));
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const businessId = req.businessId;
    const { name, phone, address, description, primaryColor, logo, businessType, defaultAppointmentDuration, professionalName } = req.body;

    // Usar transacción para actualizar tanto el negocio como el usuario admin
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar configuración del negocio
      const updatedBusiness = await tx.business.update({
        where: { id: businessId },
        data: {
          ...(name && { name }),
          ...(phone && { phone }),
          ...(address && { address }),
          ...(description && { description }),
          ...(primaryColor && { primaryColor }),
          ...(logo && { logo }),
          ...(businessType && { businessType }),
          ...(defaultAppointmentDuration && { defaultAppointmentDuration })
        }
      });

      // Si se proporciona professionalName, actualizar el usuario admin
      if (professionalName) {
        await tx.user.updateMany({
          where: { 
            businessId: businessId,
            role: 'ADMIN',
            isActive: true
          },
          data: {
            name: professionalName
          }
        });
      }

      return updatedBusiness;
    });

    // Obtener la configuración actualizada con el nombre del profesional
    const businessWithProfessional = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        planType: true,
        maxAppointments: true,
        logo: true,
        phone: true,
        address: true,
        description: true,
        primaryColor: true,
        businessType: true,
        defaultAppointmentDuration: true,
        createdAt: true,
        updatedAt: true,
        users: {
          where: { role: 'ADMIN', isActive: true },
          select: { name: true },
          take: 1
        }
      }
    });

    const professionalNameResult = businessWithProfessional?.users[0]?.name || null;

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: {
        ...result,
        professionalName: professionalNameResult
      }
    });

  } catch (error) {
    console.error('Error actualizando configuración del negocio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener horarios de trabajo
const getWorkingHours = async (req, res) => {
  try {
    const businessId = req.businessId;

    // Obtener usuarios activos del negocio
    const users = await prisma.user.findMany({
      where: {
        businessId: businessId,
        isActive: true
      },
      include: {
        workingHours: {
          orderBy: {
            dayOfWeek: 'asc'
          }
        }
      }
    });

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error obteniendo horarios de trabajo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar horarios de trabajo de un usuario
const updateWorkingHours = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { workingHours } = req.body; // Array de horarios por día
    const businessId = req.businessId;

    // Verificar que el usuario pertenece al negocio
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        businessId: businessId
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar horarios existentes
    await prisma.workingHours.deleteMany({
      where: { userId: userId }
    });

    // Crear nuevos horarios
    if (workingHours && workingHours.length > 0) {
      const newWorkingHours = workingHours.map(wh => ({
        userId: userId,
        dayOfWeek: wh.dayOfWeek,
        startTime: wh.startTime,
        endTime: wh.endTime,
        isActive: wh.isActive ?? true
      }));

      await prisma.workingHours.createMany({
        data: newWorkingHours
      });
    }

    // Obtener horarios actualizados
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workingHours: {
          orderBy: {
            dayOfWeek: 'asc'
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Horarios de trabajo actualizados exitosamente',
      data: updatedUser
    });

  } catch (error) {
    console.error('Error actualizando horarios de trabajo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener feriados
const getHolidays = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { year } = req.query;

    let whereClause = { businessId };
    
    if (year) {
      const startYear = new Date(`${year}-01-01`);
      const endYear = new Date(`${year}-12-31`);
      whereClause.date = {
        gte: startYear,
        lte: endYear
      };
    }

    const holidays = await prisma.holiday.findMany({
      where: whereClause,
      orderBy: {
        date: 'asc'
      }
    });

    res.json({
      success: true,
      data: holidays
    });

  } catch (error) {
    console.error('Error obteniendo feriados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear feriado
const createHoliday = async (req, res) => {
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
    const { name, date, isRecurring } = req.body;

    const holiday = await prisma.holiday.create({
      data: {
        businessId,
        name,
        date: new Date(date),
        isRecurring: isRecurring || false
      }
    });

    res.status(201).json({
      success: true,
      message: 'Feriado creado exitosamente',
      data: holiday
    });

  } catch (error) {
    console.error('Error creando feriado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar feriado
const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;
    const { name, date, isRecurring } = req.body;

    const holiday = await prisma.holiday.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Feriado no encontrado'
      });
    }

    const updatedHoliday = await prisma.holiday.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(date && { date: new Date(date) }),
        ...(isRecurring !== undefined && { isRecurring })
      }
    });

    res.json({
      success: true,
      message: 'Feriado actualizado exitosamente',
      data: updatedHoliday
    });

  } catch (error) {
    console.error('Error actualizando feriado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar feriado
const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    const holiday = await prisma.holiday.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Feriado no encontrado'
      });
    }

    await prisma.holiday.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Feriado eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando feriado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de uso del plan
const getPlanUsage = async (req, res) => {
  try {
    const businessId = req.businessId;

    // Obtener información del negocio
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        planType: true,
        maxAppointments: true
      }
    });

    // Contar citas del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const currentMonthAppointments = await prisma.appointment.count({
      where: {
        businessId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    // Contar servicios activos
    const activeServices = await prisma.service.count({
      where: {
        businessId,
        isActive: true
      }
    });

    // Contar usuarios activos
    const activeUsers = await prisma.user.count({
      where: {
        businessId,
        isActive: true
      }
    });

    // Contar clientes únicos
    const totalClients = await prisma.client.count({
      where: { businessId }
    });

    const planLimits = {
      FREE: { appointments: 30, services: 3, users: 1 },
      BASIC: { appointments: 100, services: 10, users: 3 },
      PREMIUM: { appointments: 500, services: 25, users: 10 },
      ENTERPRISE: { appointments: -1, services: -1, users: -1 } // Ilimitado
    };

    const currentLimits = planLimits[business.planType];

    res.json({
      success: true,
      data: {
        planType: business.planType,
        usage: {
          appointments: {
            current: currentMonthAppointments,
            limit: business.maxAppointments,
            percentage: business.maxAppointments > 0 ? Math.round((currentMonthAppointments / business.maxAppointments) * 100) : 0
          },
          services: {
            current: activeServices,
            limit: currentLimits.services,
            percentage: currentLimits.services > 0 ? Math.round((activeServices / currentLimits.services) * 100) : 0
          },
          users: {
            current: activeUsers,
            limit: currentLimits.users,
            percentage: currentLimits.users > 0 ? Math.round((activeUsers / currentLimits.users) * 100) : 0
          },
          clients: {
            total: totalClients
          }
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de uso:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getBusinessConfig,
  updateBusinessConfig,
  getWorkingHours,
  updateWorkingHours,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getPlanUsage
}; 