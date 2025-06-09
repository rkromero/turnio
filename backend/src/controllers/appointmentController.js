const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');
const { getActiveBranchIds } = require('../utils/branchUtils');

// Obtener todos los turnos del negocio
const getAppointments = async (req, res) => {
  try {
    const { date, status, serviceId, userId } = req.query;
    const businessId = req.businessId;

    // Obtener sucursales activas (auto-crea si no existen)
    const branchIds = await getActiveBranchIds(businessId);

    // Construir filtros
    const where = { 
      businessId,
      branchId: { in: branchIds }
    };

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

    // Para usuarios específicos, verificar que pertenezcan a una sucursal activa
    if (userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          businessId,
          branchId: { in: branchIds }
        }
      });
      
      if (user) {
        where.userId = userId;
      }
    }

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
        },
        branch: {
          select: {
            id: true,
            name: true,
            isMain: true
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

    const { clientName, clientEmail, clientPhone, serviceId, userId, startTime, notes, branchId } = req.body;
    const businessId = req.businessId;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);
    
    // Determinar la sucursal (usar la especificada o la principal)
    let targetBranchId = branchId;
    if (!targetBranchId || !branchIds.includes(targetBranchId)) {
      const mainBranch = await prisma.branch.findFirst({
        where: {
          businessId,
          isMain: true,
          isActive: true
        }
      });
      targetBranchId = mainBranch?.id || branchIds[0];
    }

    // Verificar límites del plan
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { planType: true }
    });

    // Contar citas del mes actual (incluir todas las sucursales)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const currentMonthAppointments = await prisma.appointment.count({
      where: {
        businessId,
        branchId: { in: branchIds },
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        status: { not: 'CANCELLED' }
      }
    });

    // Usar los límites del planController
    const { AVAILABLE_PLANS } = require('./planController');
    const appointmentLimit = AVAILABLE_PLANS[business.planType].limits.appointments;
    
    if (appointmentLimit !== -1 && currentMonthAppointments >= appointmentLimit) {
      return res.status(400).json({
        success: false,
        message: `Has alcanzado el límite de citas de tu plan ${business.planType} (${appointmentLimit} citas por mes). Considera actualizar tu plan.`
      });
    }

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

    // Verificar que el usuario (profesional) pertenezca al negocio y sucursal si se especifica
    if (userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          businessId,
          branchId: { in: branchIds },
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
        branchId: targetBranchId,
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
        branchId: targetBranchId,
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
        },
        branch: {
          select: {
            id: true,
            name: true,
            isMain: true
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
    const { status, notes, startTime, serviceId, userId, branchId } = req.body;
    const businessId = req.businessId;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    // Verificar que el turno pertenezca al negocio y a una sucursal activa
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        businessId,
        branchId: { in: branchIds }
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
    if (branchId && branchIds.includes(branchId)) updateData.branchId = branchId;

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
        },
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

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    const appointment = await prisma.appointment.updateMany({
      where: {
        id,
        businessId,
        branchId: { in: branchIds }
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
    const { date, serviceId, branchId } = req.query;

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

    // Obtener sucursales activas para incluir en las consultas
    const branchIds = await getActiveBranchIds(business.id);

    // Obtener turnos ocupados para la fecha
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const occupiedSlots = await prisma.appointment.findMany({
      where: {
        businessId: business.id,
        branchId: { in: branchIds },
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
    let totalSlotsCount = 0; // Contador total de slots para el día
    let availableSlotsCount = 0; // Contador de slots disponibles

    for (const user of business.users) {
      const workingHour = user.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
      
      if (!workingHour) continue;

              // Generar slots para este profesional
        const userSlots = await generateAvailableSlots(
          user.id,
          targetDate,
          workingHour,
          service?.duration || business.defaultAppointmentDuration || 60,
          business.defaultAppointmentDuration || 30,
          branchId || user.branchId // Usar branchId del query o del usuario
        );

      // Filtrar slots ocupados
      const availableUserSlots = userSlots.filter(slot => {
        const slotStart = new Date(slot.datetime);
        const slotEnd = new Date(slotStart.getTime() + (service?.duration || 60) * 60000);
        
        return !occupiedSlots.some(occupied => {
          return occupied.userId === user.id &&
                 ((occupied.startTime <= slotStart && occupied.endTime > slotStart) ||
                  (occupied.startTime < slotEnd && occupied.endTime >= slotEnd));
        });
      });

      totalSlotsCount += userSlots.length;
      availableSlotsCount += availableUserSlots.length;

      availableSlots.push({
        professional: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          phone: user.phone,
          role: user.role
        },
        slots: availableUserSlots,
        workingHours: {
          start: workingHour.startTime,
          end: workingHour.endTime
        }
      });
    }

    // Calcular estadísticas de urgencia
    const urgencyStats = {
      totalSlots: totalSlotsCount,
      availableSlots: availableSlotsCount,
      occupiedSlots: totalSlotsCount - availableSlotsCount,
      occupancy: totalSlotsCount > 0 ? Math.round(((totalSlotsCount - availableSlotsCount) / totalSlotsCount) * 100) : 0,
      urgencyLevel: availableSlotsCount <= 3 ? 'high' : availableSlotsCount <= 8 ? 'medium' : 'low',
      urgencyMessage: getUrgencyMessage(availableSlotsCount, targetDate)
    };

    res.json({
      success: true,
      data: {
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug
        },
        service,
        date: targetDate.toISOString().split('T')[0],
        slots: availableSlots,
        urgency: urgencyStats
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

// Función auxiliar para generar mensaje de urgencia
function getUrgencyMessage(availableCount, date) {
  const isToday = new Date().toDateString() === date.toDateString();
  const isTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString() === date.toDateString();
  
  let timeReference = '';
  if (isToday) timeReference = 'hoy';
  else if (isTomorrow) timeReference = 'mañana';
  else timeReference = 'este día';

  if (availableCount === 0) {
    return `No quedan horarios disponibles para ${timeReference}`;
  } else if (availableCount === 1) {
    return `¡Solo queda 1 horario disponible ${timeReference}!`;
  } else if (availableCount <= 3) {
    return `¡Solo quedan ${availableCount} horarios disponibles ${timeReference}!`;
  } else if (availableCount <= 8) {
    return `Quedan ${availableCount} horarios disponibles ${timeReference}`;
  } else {
    return `Varios horarios disponibles ${timeReference}`;
  }
}

// Obtener profesionales disponibles y sus horarios para un negocio
const getAvailableProfessionals = async (req, res) => {
  try {
    const { businessSlug } = req.params;
    const { date, serviceId, branchId } = req.query;

    // Buscar el negocio por slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: {
        services: {
          where: { isActive: true }
        },
        users: {
          where: { 
            isActive: true,
            ...(branchId && { branchId: branchId })
          },
          include: {
            workingHours: {
              where: { isActive: true }
            },
            branch: {
              select: {
                id: true,
                name: true,
                slug: true
              }
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

    const professionals = business.users;
    let professionalsWithSlots = [];
    let totalSlotsCount = 0;
    let availableSlotsCount = 0;
    
    if (date) {
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay(); // 0=Domingo, 1=Lunes, etc.
      
      for (const professional of professionals) {
        // Buscar horarios de trabajo para este día
        const workingHour = professional.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
        
        if (!workingHour) {
          // No trabaja este día
          professionalsWithSlots.push({
            ...professional,
            availableSlots: [],
            workingToday: false,
            slotsCount: 0
          });
          continue;
        }

        // Generar slots disponibles (en getAvailableProfessionals)
        // Necesitamos pasar el business para acceder a defaultAppointmentDuration
        const availableSlots = await generateAvailableSlots(
          professional.id,
          targetDate,
          workingHour,
          service?.duration || business.defaultAppointmentDuration || 60,
          business.defaultAppointmentDuration || 30,
          branchId || professional.branchId // Usar branchId del query o del profesional
        );

        totalSlotsCount += availableSlots.length;
        availableSlotsCount += availableSlots.length;

        professionalsWithSlots.push({
          id: professional.id,
          name: professional.name,
          avatar: professional.avatar,
          phone: professional.phone,
          role: professional.role,
          availableSlots,
          workingToday: true,
          slotsCount: availableSlots.length,
          workingHours: {
            start: workingHour.startTime,
            end: workingHour.endTime
          }
        });
      }
    } else {
      // Sin fecha específica, solo devolver profesionales
      professionalsWithSlots = professionals.map(prof => ({
        id: prof.id,
        name: prof.name,
        avatar: prof.avatar,
        phone: prof.phone,
        role: prof.role,
        workingHours: prof.workingHours,
        slotsCount: 0
      }));
    }

    // Calcular estadísticas de urgencia solo si hay fecha
    const urgencyStats = date ? {
      totalSlots: totalSlotsCount,
      availableSlots: availableSlotsCount,
      urgencyLevel: availableSlotsCount <= 3 ? 'high' : availableSlotsCount <= 8 ? 'medium' : 'low',
      urgencyMessage: getUrgencyMessage(availableSlotsCount, new Date(date))
    } : null;

    res.json({
      success: true,
      data: {
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug
        },
        service,
        professionals: professionalsWithSlots,
        totalProfessionals: professionals.length,
        date: date || null,
        urgency: urgencyStats
      }
    });

  } catch (error) {
    console.error('Error obteniendo profesionales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para generar slots disponibles
async function generateAvailableSlots(professionalId, date, workingHour, serviceDuration, businessSlotDuration = 30, branchId = null) {
  const slots = [];
  
  // Parsear horarios de trabajo
  const [startHour, startMin] = workingHour.startTime.split(':').map(Number);
  const [endHour, endMin] = workingHour.endTime.split(':').map(Number);
  
  // Crear fechas de inicio y fin para el día
  const startTime = new Date(date);
  startTime.setHours(startHour, startMin, 0, 0);
  
  const endTime = new Date(date);
  endTime.setHours(endHour, endMin, 0, 0);
  
  // Obtener citas existentes para este profesional en este día
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      userId: professionalId,
      startTime: {
        gte: startTime,
        lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) // fin del día
      },
      status: {
        in: ['CONFIRMED', 'COMPLETED']
      }
    },
    select: {
      startTime: true,
      endTime: true
    }
  });

  // Obtener horarios de descanso de la sucursal para este día
  let breakTimes = [];
  if (branchId) {
    const dayOfWeek = date.getDay(); // 0=domingo, 1=lunes, etc.
    
    breakTimes = await prisma.branchBreakTime.findMany({
      where: {
        branchId: branchId,
        dayOfWeek: dayOfWeek,
        isActive: true
      },
      select: {
        startTime: true,
        endTime: true,
        name: true
      }
    });
  }

  // Usar la duración configurada del negocio para los slots
  const slotDuration = businessSlotDuration; // Usar configuración del negocio
  let currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000);
    
    // Verificar si este slot no se superpone con citas existentes
    const isAvailableAppointments = !existingAppointments.some(appointment => {
      const appointmentStart = new Date(appointment.startTime);
      const appointmentEnd = new Date(appointment.endTime);
      
      return (
        (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
        (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
        (currentTime <= appointmentStart && slotEnd >= appointmentEnd)
      );
    });

    // Verificar si este slot no se superpone con horarios de descanso
    const isAvailableBreakTimes = !breakTimes.some(breakTime => {
      const [breakStartHour, breakStartMin] = breakTime.startTime.split(':').map(Number);
      const [breakEndHour, breakEndMin] = breakTime.endTime.split(':').map(Number);
      
      const breakStart = new Date(date);
      breakStart.setHours(breakStartHour, breakStartMin, 0, 0);
      
      const breakEnd = new Date(date);
      breakEnd.setHours(breakEndHour, breakEndMin, 0, 0);
      
      return (
        (currentTime >= breakStart && currentTime < breakEnd) ||
        (slotEnd > breakStart && slotEnd <= breakEnd) ||
        (currentTime <= breakStart && slotEnd >= breakEnd)
      );
    });

    // Solo agregar si el slot completo cabe antes del fin del horario laboral
    // y no se superpone con citas existentes ni horarios de descanso
    if (isAvailableAppointments && isAvailableBreakTimes && slotEnd <= endTime) {
      slots.push({
        time: currentTime.toTimeString().slice(0, 5), // HH:MM
        datetime: currentTime.toISOString(),
        available: true
      });
    }
    
    // Avanzar al siguiente slot
    currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
  }
  
  return slots;
}

// Obtener todos los profesionales de un negocio (para modo "por profesional")
const getAllProfessionals = async (req, res) => {
  try {
    const { businessSlug } = req.params;
    const { branchId } = req.query;

    // Buscar el negocio por slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: {
        users: {
          where: { 
            isActive: true,
            ...(branchId && { branchId: branchId })
          },
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
            role: true,
            branchId: true,
            branch: {
              select: {
                id: true,
                name: true,
                slug: true
              }
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

    return res.json({
      success: true,
      data: {
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug
        },
        professionals: business.users,
        totalProfessionals: business.users.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo profesionales:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener servicios que puede realizar un profesional específico
const getProfessionalServices = async (req, res) => {
  try {
    const { businessSlug, professionalId } = req.params;

    // Buscar el negocio por slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: {
        services: {
          where: { isActive: true },
          select: {
            id: true
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

    // Verificar que el profesional pertenezca al negocio
    const professional = await prisma.user.findFirst({
      where: {
        id: professionalId,
        businessId: business.id,
        isActive: true
      }
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Profesional no encontrado'
      });
    }

    // Por ahora, devolvemos todos los servicios del negocio
    // En el futuro se puede implementar una relación many-to-many User-Service
    const serviceIds = business.services.map(service => service.id);

    return res.json({
      success: true,
      data: {
        serviceIds
      }
    });

  } catch (error) {
    console.error('Error obteniendo servicios del profesional:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener servicios del negocio
const getBusinessServices = async (req, res) => {
  try {
    const { businessSlug } = req.params;

    // Buscar el negocio por slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: {
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            price: true,
            color: true,
            isActive: true
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

    return res.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug
      },
      services: business.services
    });

  } catch (error) {
    console.error('Error obteniendo servicios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener disponibilidad por fechas para un profesional y servicio específico
const getProfessionalAvailability = async (req, res) => {
  try {
    const { businessSlug, professionalId } = req.params;
    const { serviceId, fromDate, toDate } = req.query;

    // Buscar el negocio por slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: {
        services: {
          where: { isActive: true }
        }
      }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    // Verificar que el profesional pertenezca al negocio
    const professional = await prisma.user.findFirst({
      where: {
        id: professionalId,
        businessId: business.id,
        isActive: true
      },
      include: {
        workingHours: {
          where: { isActive: true }
        }
      }
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Profesional no encontrado'
      });
    }

    // Verificar que el servicio exista
    const service = business.services.find(s => s.id === serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Generar fechas desde fromDate hasta toDate (o los próximos 30 días por defecto)
    const startDate = fromDate ? new Date(fromDate) : new Date();
    const endDate = toDate ? new Date(toDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const dateAvailability = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Buscar horarios de trabajo para este día
      const workingHour = professional.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
      
      if (!workingHour) {
        // No trabaja este día
        dateAvailability.push({
          date: currentDate.toISOString().split('T')[0],
          available: false,
          slotsCount: 0,
          reason: 'No trabaja este día'
        });
      } else {
        // Generar slots disponibles para este día (en getProfessionalAvailability)
        const availableSlots = await generateAvailableSlots(
          professionalId,
          currentDate,
          workingHour,
          service.duration,
          business.defaultAppointmentDuration || 30,
          professional.branchId // Usar la sucursal del profesional
        );

        dateAvailability.push({
          date: currentDate.toISOString().split('T')[0],
          available: availableSlots.length > 0,
          slotsCount: availableSlots.length,
          reason: availableSlots.length === 0 ? 'Sin horarios disponibles' : null
        });
      }

      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return res.json({
      success: true,
      data: {
        professional: {
          id: professional.id,
          name: professional.name
        },
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration
        },
        availability: dateAvailability,
        suggestedDates: dateAvailability
          .filter(d => d.available && d.slotsCount > 0)
          .slice(0, 5) // Primeras 5 fechas disponibles
          .map(d => d.date)
      }
    });

  } catch (error) {
    console.error('Error obteniendo disponibilidad del profesional:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener sucursales públicas de un negocio
const getPublicBranches = async (req, res) => {
  try {
    const { businessSlug } = req.params;

    // Buscar el negocio por slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: {
        branches: {
          where: { 
            isActive: true 
          },
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            phone: true,
            description: true,
            isMain: true,
            latitude: true,
            longitude: true,
            _count: {
              select: {
                users: { 
                  where: { isActive: true } 
                }
              }
            }
          },
          orderBy: [
            { isMain: 'desc' }, // Principal primero
            { name: 'asc' }
          ]
        }
      }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    const branches = business.branches.map(branch => ({
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      address: branch.address,
      phone: branch.phone,
      description: branch.description,
      isMain: branch.isMain,
      latitude: branch.latitude,
      longitude: branch.longitude,
      professionalCount: branch._count.users
    }));

    return res.json({
      success: true,
      data: {
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug
        },
        branches
      }
    });

  } catch (error) {
    console.error('Error obteniendo sucursales públicas:', error);
    return res.status(500).json({
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
  getAvailableProfessionals,
  getAllProfessionals,
  getProfessionalServices,
  getBusinessServices,
  getProfessionalAvailability,
  getPublicBranches
}; 