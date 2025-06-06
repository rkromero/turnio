const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todos los turnos del negocio
const getAppointments = async (req, res) => {
  try {
    const { date, status, serviceId, userId } = req.query;
    const businessId = req.businessId;

    // Construir filtros
    const where = { businessId };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      where.startTime = {
        gte: startDate,
        lt: endDate
      };
    }

    if (status) where.status = status;
    if (serviceId) where.serviceId = serviceId;
    if (userId) where.userId = userId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            color: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json({
      success: true,
      data: appointments
    });

  } catch (error) {
    console.error('Error obteniendo turnos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nuevo turno
const createAppointment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { clientName, clientEmail, clientPhone, serviceId, userId, startTime, notes } = req.body;
    const businessId = req.businessId;

    // Verificar que el servicio pertenezca al negocio
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

    // Verificar que el usuario (profesional) pertenezca al negocio si se especifica
    if (userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          businessId,
          isActive: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Profesional no encontrado'
        });
      }
    }

    // Calcular hora de fin basada en la duración del servicio
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);

    // Verificar disponibilidad (no hay otro turno en el mismo horario)
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        businessId,
        userId: userId || undefined,
        status: { not: 'CANCELLED' },
        OR: [
          {
            AND: [
              { startTime: { lte: startDateTime } },
              { endTime: { gt: startDateTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endDateTime } },
              { endTime: { gte: endDateTime } }
            ]
          }
        ]
      }
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un turno en ese horario'
      });
    }

    // Crear o encontrar cliente
    let client = await prisma.client.findFirst({
      where: {
        businessId,
        OR: [
          { email: clientEmail },
          { phone: clientPhone }
        ]
      }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          businessId,
          name: clientName,
          email: clientEmail,
          phone: clientPhone
        }
      });
    }

    // Crear el turno
    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        clientId: client.id,
        serviceId,
        userId,
        startTime: startDateTime,
        endTime: endDateTime,
        notes,
        status: 'CONFIRMED'
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            color: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Turno creado exitosamente',
      data: appointment
    });

  } catch (error) {
    console.error('Error creando turno:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar turno
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, startTime, serviceId, userId } = req.body;
    const businessId = req.businessId;

    // Verificar que el turno pertenezca al negocio
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Turno no encontrado'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (userId !== undefined) updateData.userId = userId;

    // Si se cambia la hora o el servicio, recalcular
    if (startTime || serviceId) {
      let service = existingAppointment.serviceId;
      
      if (serviceId) {
        const serviceData = await prisma.service.findFirst({
          where: {
            id: serviceId,
            businessId,
            isActive: true
          }
        });

        if (!serviceData) {
          return res.status(404).json({
            success: false,
            message: 'Servicio no encontrado'
          });
        }
        
        service = serviceData;
        updateData.serviceId = serviceId;
      } else {
        service = await prisma.service.findUnique({
          where: { id: existingAppointment.serviceId }
        });
      }

      const newStartTime = startTime ? new Date(startTime) : existingAppointment.startTime;
      const newEndTime = new Date(newStartTime.getTime() + service.duration * 60000);

      updateData.startTime = newStartTime;
      updateData.endTime = newEndTime;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            color: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Turno actualizado exitosamente',
      data: appointment
    });

  } catch (error) {
    console.error('Error actualizando turno:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cancelar turno
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    const appointment = await prisma.appointment.updateMany({
      where: {
        id,
        businessId
      },
      data: {
        status: 'CANCELLED'
      }
    });

    if (appointment.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Turno no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Turno cancelado exitosamente'
    });

  } catch (error) {
    console.error('Error cancelando turno:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener turnos disponibles para reserva pública
const getAvailableSlots = async (req, res) => {
  try {
    const { businessSlug } = req.params;
    const { date, serviceId } = req.query;

    // Buscar el negocio por slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: {
        services: {
          where: { isActive: true }
        },
        users: {
          where: { isActive: true },
          include: {
            workingHours: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    // Si se especifica un servicio, verificar que existe
    let service = null;
    if (serviceId) {
      service = business.services.find(s => s.id === serviceId);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }
    }

    // Obtener turnos ocupados para la fecha
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const occupiedSlots = await prisma.appointment.findMany({
      where: {
        businessId: business.id,
        startTime: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { not: 'CANCELLED' }
      },
      select: {
        startTime: true,
        endTime: true,
        userId: true
      }
    });

    // Generar slots disponibles basados en horarios de trabajo
    const dayOfWeek = targetDate.getDay();
    const availableSlots = [];

    for (const user of business.users) {
      const workingHour = user.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
      if (!workingHour) continue;

      const [startHour, startMinute] = workingHour.startTime.split(':').map(Number);
      const [endHour, endMinute] = workingHour.endTime.split(':').map(Number);

      const workStart = new Date(targetDate);
      workStart.setHours(startHour, startMinute, 0, 0);
      
      const workEnd = new Date(targetDate);
      workEnd.setHours(endHour, endMinute, 0, 0);

      const serviceDuration = service ? service.duration : 60; // Default 60 minutos
      
      // Generar slots cada 30 minutos
      for (let time = new Date(workStart); time < workEnd; time.setMinutes(time.getMinutes() + 30)) {
        const slotEnd = new Date(time.getTime() + serviceDuration * 60000);
        
        if (slotEnd <= workEnd) {
          // Verificar si el slot está ocupado
          const isOccupied = occupiedSlots.some(occupied => 
            occupied.userId === user.id &&
            time < occupied.endTime &&
            slotEnd > occupied.startTime
          );

          if (!isOccupied) {
            availableSlots.push({
              time: time.toISOString(),
              userId: user.id,
              userName: user.name
            });
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug
        },
        services: business.services,
        availableSlots: availableSlots.sort((a, b) => new Date(a.time) - new Date(b.time))
      }
    });

  } catch (error) {
    console.error('Error obteniendo slots disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  getAvailableSlots,
}; 