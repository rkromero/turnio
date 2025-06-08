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

    // Verificar límites del plan
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { planType: true }
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
      let workingHour = user.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
      
      // Si no hay horarios configurados, usar horarios por defecto (Lunes a Viernes 9-18)
      if (!workingHour && dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingHour = {
          startTime: '09:00',
          endTime: '18:00'
        };
      }
      
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
            time < new Date(occupied.endTime) &&
            slotEnd > new Date(occupied.startTime)
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

    // Si no hay usuarios o no hay slots, crear slots básicos con el primer usuario
    if (availableSlots.length === 0 && business.users.length > 0) {
      const user = business.users[0];
      const serviceDuration = service ? service.duration : 60;
      
      // Horarios por defecto: 9:00 - 18:00
      for (let hour = 9; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(targetDate);
          slotStart.setHours(hour, minute, 0, 0);
          
          const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
          
          if (slotEnd.getHours() < 18 || (slotEnd.getHours() === 18 && slotEnd.getMinutes() === 0)) {
            const isOccupied = occupiedSlots.some(occupied => 
              slotStart < new Date(occupied.endTime) &&
              slotEnd > new Date(occupied.startTime)
            );

            if (!isOccupied) {
              availableSlots.push({
                time: slotStart.toISOString(),
                userId: user.id,
                userName: user.name
              });
            }
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

// Obtener profesionales disponibles y sus horarios para un negocio
const getAvailableProfessionals = async (req, res) => {
  try {
    const { businessSlug } = req.params;
    const { date, serviceId } = req.query;

    // Buscar el negocio
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    // Obtener el servicio si se especifica
    let service = null;
    if (serviceId) {
      service = await prisma.service.findFirst({
        where: {
          id: serviceId,
          businessId: business.id,
          isActive: true
        }
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }
    }

    // Obtener profesionales activos del negocio
    const professionals = await prisma.user.findMany({
      where: {
        businessId: business.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        phone: true,
        role: true,
        workingHours: {
          where: { isActive: true },
          orderBy: { dayOfWeek: 'asc' }
        }
      },
      orderBy: [
        { role: 'asc' }, // ADMIN primero
        { name: 'asc' }
      ]
    });

    // Si se especifica una fecha, calcular horarios disponibles
    let professionalsWithSlots = [];
    
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
            workingToday: false
          });
          continue;
        }

        // Generar slots disponibles
        const availableSlots = await generateAvailableSlots(
          professional.id,
          targetDate,
          workingHour,
          service?.duration || 60 // duración por defecto 60 min
        );

        professionalsWithSlots.push({
          id: professional.id,
          name: professional.name,
          avatar: professional.avatar,
          phone: professional.phone,
          role: professional.role,
          availableSlots,
          workingToday: true,
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
        workingHours: prof.workingHours
      }));
    }

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
        date: date || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo profesionales disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para generar slots disponibles
async function generateAvailableSlots(professionalId, date, workingHour, serviceDuration) {
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

  // Generar slots de 30 minutos (o según la duración del servicio)
  const slotDuration = Math.min(serviceDuration, 30); // slots mínimos de 30 min
  let currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000);
    
    // Verificar si este slot no se superpone con citas existentes
    const isAvailable = !existingAppointments.some(appointment => {
      const appointmentStart = new Date(appointment.startTime);
      const appointmentEnd = new Date(appointment.endTime);
      
      return (
        (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
        (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
        (currentTime <= appointmentStart && slotEnd >= appointmentEnd)
      );
    });

    // Solo agregar si el slot completo cabe antes del fin del horario laboral
    if (isAvailable && slotEnd <= endTime) {
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

module.exports = {
  getAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  getAvailableSlots,
  getAvailableProfessionals
}; 