const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');
const { getActiveBranchIds } = require('../utils/branchUtils');
const notificationService = require('../services/notificationService');

// Obtener todos los turnos del negocio
const getAppointments = async (req, res) => {
  try {
    const { date, status, serviceId, userId, clientId } = req.query;
    const businessId = req.businessId;
    const currentUser = req.user; // Usuario autenticado

    // Obtener sucursales activas (auto-crea si no existen)
    const branchIds = await getActiveBranchIds(businessId);

    // Construir filtros
    const where = { 
      businessId,
      branchId: { in: branchIds }
    };

    // 🔒 FILTRO POR ROL: Si es EMPLOYEE, solo ver sus propios turnos
    if (currentUser.role === 'EMPLOYEE') {
      where.userId = currentUser.id;
      console.log(`👤 Empleado ${currentUser.name} (${currentUser.id}) - Filtrando solo sus turnos`);
    } else {
      // Si es ADMIN, puede filtrar por userId desde query params
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
    }

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
    if (clientId) where.clientId = clientId;

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
    console.log('🔍 [APPOINTMENT DEBUG] Datos recibidos:', req.body);
    console.log('🔍 [APPOINTMENT DEBUG] Usuario:', req.user?.name, '- Rol:', req.user?.role);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [APPOINTMENT DEBUG] Errores de validación:', errors.array());
      
      // Log más detallado de cada error
      errors.array().forEach(error => {
        console.log(`   ❌ Campo: ${error.path || error.param}, Valor: "${error.value}", Error: ${error.msg}`);
      });
      
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array(),
        details: errors.array().map(e => `${e.path}: ${e.msg}`)
      });
    }

    const { clientName, clientEmail, clientPhone, serviceId, userId, startTime, notes, branchId, paymentMethod, ignoreScoreWarning } = req.body;
    const businessId = req.businessId;
    const currentUser = req.user;

    // 👤 AUTO-ASIGNACIÓN: Si es EMPLOYEE y no se especifica userId, asignar automáticamente
    let assignedUserId = userId;
    if (currentUser.role === 'EMPLOYEE' && !userId) {
      assignedUserId = currentUser.id;
      console.log(`👤 [AUTO-ASSIGN] Empleado ${currentUser.name} auto-asignado al turno`);
    }

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
        message: `No puedes crear más citas en el Plan ${business.planType}`,
        error: 'PLAN_LIMIT_EXCEEDED',
        details: {
          currentPlan: business.planType,
          currentAppointments: currentMonthAppointments,
          maxAppointments: appointmentLimit,
          nextPlan: business.planType === 'FREE' ? 'BASIC' : business.planType === 'BASIC' ? 'PREMIUM' : 'ENTERPRISE',
          nextPlanAppointments: business.planType === 'FREE' ? 100 : business.planType === 'BASIC' ? 500 : -1,
          upgradeRequired: true,
          feature: 'appointments'
        }
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
    if (assignedUserId) {
      const user = await prisma.user.findFirst({
        where: {
          id: assignedUserId,
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
    // El frontend envía "2025-01-17T17:00" (hora local sin zona horaria)
    // Parseamos manualmente para guardar exactamente esos valores en UTC sin conversión
    console.log('🕐 [TIMEZONE DEBUG] Input:', startTime);
    
    const [datePart, timePart] = startTime.includes('T') 
      ? startTime.split('T') 
      : [startTime, '00:00'];
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Crear Date en UTC con los valores exactos (sin conversión de zona horaria)
    const startDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    console.log('🕐 [TIMEZONE DEBUG] Parsed Date:', startDateTime);
    console.log('🕐 [TIMEZONE DEBUG] ISO String:', startDateTime.toISOString());
    
    const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);

    // ⏰ VALIDAR INTERVALOS DE 30 MINUTOS
    const minutesValue = startDateTime.getMinutes();
    if (minutesValue !== 0 && minutesValue !== 30) {
      return res.status(400).json({
        success: false,
        message: 'Solo se permiten horarios en punto (00) o y media (30)',
        error: 'INVALID_TIME_INTERVAL',
        details: {
          providedMinutes: minutesValue,
          allowedMinutes: [0, 30],
          note: 'Los turnos deben comenzar en horarios de 30 minutos (en punto o y media)'
        }
      });
    }

    // Verificar disponibilidad (no hay otro turno en el mismo horario)
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        businessId,
        branchId: targetBranchId,
        userId: assignedUserId || undefined,
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

    // 💳 VALIDAR SCORING DEL CLIENTE
    let appointmentStatus = 'CONFIRMED';
    let clientScoringInfo = null;
    const finalPaymentMethod = paymentMethod || 'LOCAL'; // Por defecto: Pago en el local
    
    // Evaluar scoring del cliente si tiene email o teléfono
    if (client.email || client.phone) {
      try {
        const PaymentValidationService = require('../services/paymentValidationService');
        const paymentValidation = await PaymentValidationService.getPaymentOptions(
          client.email, 
          client.phone
        );
        
        console.log('💳 [SCORING CHECK] Validando cliente:', {
          email: client.email,
          scoring: paymentValidation.scoring?.starRating || 'sin historial',
          requiresPayment: paymentValidation.requiresPayment,
          reason: paymentValidation.reason,
          paymentMethod: finalPaymentMethod,
          ignoreWarning: ignoreScoreWarning
        });
        
        clientScoringInfo = paymentValidation;
        
        // ⚠️ VALIDACIÓN: Cliente con ranking bajo + Pago en el local
        if (paymentValidation.requiresPayment && finalPaymentMethod === 'LOCAL') {
          // Si NO se ignora la advertencia, mostrar diálogo de confirmación
          if (!ignoreScoreWarning) {
            console.log('⚠️ [SCORING CHECK] Cliente con ranking bajo - Requiere confirmación');
            return res.status(400).json({
              success: false,
              error: 'LOW_SCORING_WARNING',
              message: 'Este cliente tiene un ranking bajo y es posible que no cumpla con el turno. ¿Querés igualmente crear el turno con pago en el local?',
              clientScoring: {
                starRating: paymentValidation.scoring?.starRating || 'bajo',
                totalBookings: paymentValidation.scoring?.totalBookings || 0,
                attendedCount: paymentValidation.scoring?.attendedCount || 0,
                noShowCount: paymentValidation.scoring?.noShowCount || 0,
                reason: paymentValidation.reason
              },
              requiresConfirmation: true,
              confirmationMessage: '¿Querés crear el turno de todas formas?'
            });
          }
          
          // Si se ignora la advertencia, proceder pero agregar nota
          console.log('✅ [SCORING CHECK] Confirmación recibida - Creando turno a pesar del ranking bajo');
        }
      } catch (error) {
        console.error('❌ [SCORING CHECK] Error evaluando scoring:', error);
        // En caso de error, proceder normalmente (conservador)
      }
    }

    // Preparar notas adicionales si se ignoró advertencia de scoring
    let finalNotes = notes;
    if (clientScoringInfo?.requiresPayment && ignoreScoreWarning && finalPaymentMethod === 'LOCAL') {
      finalNotes = `${notes ? notes + ' | ' : ''}⚠️ CLIENTE CON RANKING BAJO - Confirmado por ${req.user.role === 'ADMIN' ? 'administrador' : 'empleado'}`;
    }

    // Crear el turno
    const appointment = await prisma.appointment.create({
      data: {
        businessId,
        branchId: targetBranchId,
        clientId: client.id,
        serviceId,
        userId: assignedUserId,
        startTime: startDateTime,
        endTime: endDateTime,
        notes: finalNotes,
        status: appointmentStatus,
        paymentMethod: finalPaymentMethod
      },
      include: {
        business: true,
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
            address: true,
            phone: true,
            isMain: true
          }
        }
      }
    });

    console.log('✅ [APPOINTMENT CREATED]');
    console.log('   📅 Start Time (saved):', appointment.startTime);
    console.log('   📅 Start Time (ISO):', appointment.startTime.toISOString());
    console.log('   📅 Start Time (Local):', appointment.startTime.toString());
    console.log('   📅 End Time (saved):', appointment.endTime);
    console.log('   📅 End Time (ISO):', appointment.endTime.toISOString());

    // Preparar respuesta con información de scoring
    let responseMessage = 'Turno creado exitosamente';
    let scoringInfo = null;
    
    if (clientScoringInfo?.requiresPayment && ignoreScoreWarning && finalPaymentMethod === 'LOCAL') {
      responseMessage = 'Turno creado - Cliente con ranking bajo confirmado';
      scoringInfo = {
        clientHasLowScoring: true,
        warningIgnored: true,
        message: '⚠️ Turno creado a pesar del ranking bajo del cliente.',
        note: 'Se recomienda hacer seguimiento cercano a este turno.'
      };
    }

    // 📧 ENVIAR NOTIFICACIÓN DE CONFIRMACIÓN (no bloqueante)
    notificationService.sendAppointmentConfirmation(appointment)
      .then(result => {
        if (result.success) {
          console.log(`✅ Email de confirmación enviado para cita ${appointment.id}`);
        } else {
          console.warn(`⚠️ No se pudo enviar email de confirmación: ${result.error}`);
        }
      })
      .catch(error => {
        console.error(`❌ Error enviando email de confirmación:`, error);
      });

    res.status(201).json({
      success: true,
      message: responseMessage,
      data: appointment,
      ...(scoringInfo && { scoring: scoringInfo })
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

      let newStartTime;
      if (startTime) {
        // El frontend envía "2025-01-17T17:00" (hora local sin zona horaria)
        // Parseamos manualmente para guardar exactamente esos valores en UTC sin conversión
        const [datePart, timePart] = startTime.includes('T') 
          ? startTime.split('T') 
          : [startTime, '00:00'];
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Crear Date en UTC con los valores exactos (sin conversión de zona horaria)
        newStartTime = new Date(Date.UTC(year, month - 1, day, hours, minutes));
        
        // ⏰ VALIDAR INTERVALOS DE 30 MINUTOS
        const minutesValue = newStartTime.getMinutes();
        if (minutesValue !== 0 && minutesValue !== 30) {
          return res.status(400).json({
            success: false,
            message: 'Solo se permiten horarios en punto (00) o y media (30)',
            error: 'INVALID_TIME_INTERVAL',
            details: {
              providedMinutes: minutesValue,
              allowedMinutes: [0, 30],
              note: 'Los turnos deben comenzar en horarios de 30 minutos (en punto o y media)'
            }
          });
        }
      } else {
        newStartTime = existingAppointment.startTime;
      }
      const newEndTime = new Date(newStartTime.getTime() + service.duration * 60000);

      updateData.startTime = newStartTime;
      updateData.endTime = newEndTime;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        business: true,
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
            address: true,
            phone: true,
            isMain: true
          }
        }
      }
    });

    // 📧 ENVIAR NOTIFICACIÓN DE MODIFICACIÓN si cambió fecha/hora (no bloqueante)
    if (startTime || serviceId) {
      notificationService.sendAppointmentModification(appointment, existingAppointment)
        .then(result => {
          if (result.success) {
            console.log(`✅ Email de modificación enviado para cita ${appointment.id}`);
          } else {
            console.warn(`⚠️ No se pudo enviar email de modificación: ${result.error}`);
          }
        })
        .catch(error => {
          console.error(`❌ Error enviando email de modificación:`, error);
        });
    }

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
    const { reason } = req.body; // Razón opcional de cancelación
    const businessId = req.businessId;

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);

    // Primero obtener los datos completos de la cita para el email
    const appointmentData = await prisma.appointment.findFirst({
      where: {
        id,
        businessId,
        branchId: { in: branchIds }
      },
      include: {
        business: true,
        client: true,
        service: true,
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
            address: true,
            phone: true,
            isMain: true
          }
        }
      }
    });

    if (!appointmentData) {
      return res.status(404).json({
        success: false,
        message: 'Turno no encontrado'
      });
    }

    // Cancelar el turno
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      }
    });

    // 📧 ENVIAR NOTIFICACIÓN DE CANCELACIÓN (no bloqueante)
    notificationService.sendAppointmentCancellation(appointmentData, reason)
      .then(result => {
        if (result.success) {
          console.log(`✅ Email de cancelación enviado para cita ${appointmentData.id}`);
        } else {
          console.warn(`⚠️ No se pudo enviar email de cancelación: ${result.error}`);
        }
      })
      .catch(error => {
        console.error(`❌ Error enviando email de cancelación:`, error);
      });

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

// Obtener horarios disponibles para el dashboard (uso interno)
const getAvailableTimes = async (req, res) => {
  try {
    const { date, serviceId, userId, branchId } = req.query;
    const businessId = req.businessId;

    if (!date || !serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere fecha y servicio'
      });
    }

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);
    const targetBranchId = branchId || branchIds[0];

    // Obtener el servicio
    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId, isActive: true }
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Parsear la fecha (formato YYYY-MM-DD desde frontend)
    // IMPORTANTE: Trabajar todo en hora de Argentina (GMT-3)
    const [year, month, day] = date.split('-').map(Number);
    
    // Crear fechas en hora de Argentina agregando el offset -03:00
    // Esto asegura que se interpreten como hora Argentina y se conviertan a UTC automáticamente
    const startOfDay = new Date(`${date}T00:00:00-03:00`);
    const endOfDay = new Date(`${date}T23:59:59-03:00`);

    console.log('📅 [AVAILABLE TIMES] Buscando horarios para:', {
      date,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      startOfDayLocal: startOfDay.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
      endOfDayLocal: endOfDay.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
      serviceId,
      userId,
      timezone: 'America/Argentina/Buenos_Aires (GMT-3)'
    });

    // Obtener turnos existentes para ese día
    // Si se especifica userId, solo buscamos turnos de ese profesional
    // Si NO se especifica, buscamos TODOS los turnos (cualquier profesional)
    const appointmentQuery = {
      businessId,
      branchId: targetBranchId,
      status: { not: 'CANCELLED' },
      startTime: { gte: startOfDay, lte: endOfDay }
    };
    
    // Solo filtrar por userId si está definido Y no es vacío
    if (userId && userId !== '') {
      appointmentQuery.userId = userId;
    }
    
    const existingAppointments = await prisma.appointment.findMany({
      where: appointmentQuery,
      select: { id: true, startTime: true, endTime: true, userId: true },
      orderBy: { startTime: 'asc' }
    });

    console.log('📊 [AVAILABLE TIMES] Query params:', { date, serviceId, userId, branchId: targetBranchId });
    console.log('📊 [AVAILABLE TIMES] Turnos existentes encontrados:', existingAppointments.length);
    existingAppointments.forEach(apt => {
      console.log(`   - ${new Date(apt.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(apt.endTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} (Professional: ${apt.userId})`);
    });

    // Determinar horarios de trabajo
    let startHour = 8;
    let endHour = 20;
    let startMinute = 0;
    let endMinute = 0;

    // Si hay userId, obtener sus horarios de trabajo
    if (userId && userId !== '') {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado

      const workingHours = await prisma.workingHours.findFirst({
        where: {
          userId: userId,
          dayOfWeek: dayOfWeek
        }
      });

      if (workingHours) {
        // Parsear horarios configurados (formato "HH:MM")
        const [startH, startM] = workingHours.startTime.split(':').map(Number);
        const [endH, endM] = workingHours.endTime.split(':').map(Number);
        
        startHour = startH;
        startMinute = startM;
        endHour = endH;
        endMinute = endM;

        console.log(`⏰ [WORKING HOURS] Profesional ${userId} trabaja los ${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][dayOfWeek]} de ${workingHours.startTime} a ${workingHours.endTime}`);
      } else {
        console.log(`⚠️ [WORKING HOURS] No hay horarios configurados para el profesional ${userId} los ${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][dayOfWeek]}`);
        // Si no tiene horarios configurados para ese día, no hay slots disponibles
        return res.json({
          success: true,
          data: []
        });
      }
    }

    // Generar slots de 30 minutos
    const availableTimes = [];
    
    // Convertir horarios a minutos para facilitar comparación
    const workStartMinutes = startHour * 60 + startMinute;
    const workEndMinutes = endHour * 60 + endMinute;

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStartMinutes = hour * 60 + minute;
        const slotEndMinutes = slotStartMinutes + service.duration;
        
        // Verificar que el slot esté completamente dentro del horario de trabajo
        if (slotStartMinutes < workStartMinutes) continue;
        if (slotEndMinutes > workEndMinutes) continue;
        
        // Crear slots en hora de Argentina (GMT-3)
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
        const slotStart = new Date(`${date}T${timeString}-03:00`);
        const slotEnd = new Date(slotStart.getTime() + service.duration * 60000);

        // Verificar si el slot está en el pasado
        if (slotStart < new Date()) continue;

        // Verificar si hay conflicto con turnos existentes
        // Hay conflicto si el slot se superpone de cualquier forma con un turno existente
        const hasConflict = existingAppointments.some(apt => {
          const aptStart = new Date(apt.startTime);
          const aptEnd = new Date(apt.endTime);
          
          // Superposición: el slot comienza antes de que termine la cita Y termina después de que comienza la cita
          const conflict = (slotStart < aptEnd && slotEnd > aptStart);
          
          if (conflict) {
            console.log(`❌ [CONFLICT DETECTED]`);
            console.log(`   Slot: ${slotStart.toISOString()} (${slotStart.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}) - ${slotEnd.toISOString()}`);
            console.log(`   Turno existente: ${aptStart.toISOString()} (${aptStart.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}) - ${aptEnd.toISOString()}`);
            console.log(`   Comparison: slotStart (${slotStart.getTime()}) < aptEnd (${aptEnd.getTime()}) = ${slotStart < aptEnd}`);
            console.log(`   Comparison: slotEnd (${slotEnd.getTime()}) > aptStart (${aptStart.getTime()}) = ${slotEnd > aptStart}`);
          }
          
          return conflict;
        });

        if (!hasConflict) {
          // Devolver la hora en formato HH:mm (el frontend la interpretará en su zona horaria)
          availableTimes.push({
            time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            datetime: slotStart.toISOString() // ISO string incluye zona horaria UTC
          });
        }
      }
    }

    console.log(`✅ [AVAILABLE TIMES] ${availableTimes.length} horarios disponibles para ${date}`);

    res.json({
      success: true,
      data: availableTimes
    });

  } catch (error) {
    console.error('Error obteniendo horarios disponibles:', error);
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

    // OPTIMIZACIÓN: Obtener horarios de descanso de todas las sucursales de una vez
    const allBreakTimes = await prisma.branchBreakTime.findMany({
      where: {
        branchId: { in: branchIds },
        dayOfWeek: dayOfWeek,
        isActive: true
      },
      select: {
        branchId: true,
        startTime: true,
        endTime: true,
        name: true
      }
    });

    // OPTIMIZACIÓN: Agrupar citas ocupadas por usuario para acceso más rápido
    const occupiedByUser = {};
    occupiedSlots.forEach(slot => {
      if (!occupiedByUser[slot.userId]) {
        occupiedByUser[slot.userId] = [];
      }
      occupiedByUser[slot.userId].push({
        start: new Date(slot.startTime),
        end: new Date(slot.endTime)
      });
    });

    // OPTIMIZACIÓN: Procesar usuarios en paralelo
    const userPromises = business.users.map(async (user) => {
      const workingHour = user.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
      
      if (!workingHour) return null;

      // OPTIMIZACIÓN: Usar horarios de descanso específicos del usuario
      const userBranchId = branchId || user.branchId;
      const userBreakTimes = allBreakTimes.filter(bt => bt.branchId === userBranchId);

      // Generar slots para este profesional con break times pre-cargados
      const userSlots = await generateAvailableSlotsOptimized(
        user.id,
        targetDate,
        workingHour,
        service?.duration || business.defaultAppointmentDuration || 60,
        business.defaultAppointmentDuration || 30,
        userBranchId,
        userBreakTimes
      );

      // OPTIMIZACIÓN: Filtrar slots ocupados usando datos pre-cargados
      const userOccupiedSlots = occupiedByUser[user.id] || [];
      const availableUserSlots = userSlots.filter(slot => {
        const slotStart = new Date(slot.datetime);
        const slotEnd = new Date(slotStart.getTime() + (service?.duration || 60) * 60000);
        
        return !userOccupiedSlots.some(occupied => {
          return (occupied.start <= slotStart && occupied.end > slotStart) ||
                 (occupied.start < slotEnd && occupied.end >= slotEnd);
        });
      });

      return {
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
        },
        totalSlots: userSlots.length,
        availableSlots: availableUserSlots.length
      };
    });

    // Esperar a que todos los usuarios se procesen
    const userResults = await Promise.all(userPromises);
    
    // Filtrar resultados nulos y agregar a la respuesta
    userResults.forEach(result => {
      if (result) {
        availableSlots.push(result);
        totalSlotsCount += result.totalSlots;
        availableSlotsCount += result.availableSlots;
      }
    });

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

    console.log('🔍 getAvailableProfessionals - Parámetros:', { businessSlug, date, serviceId, branchId });

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
            role: { in: ['EMPLOYEE', 'ADMIN'] }, // Incluir empleados y admins como profesionales
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
    
    console.log('✅ getAvailableProfessionals - Profesionales filtrados:', {
      total: professionals.length,
      professionals: professionals.map(u => ({ 
        id: u.id, 
        name: u.name, 
        role: u.role, 
        branchId: u.branchId,
        branchName: u.branch?.name 
      }))
    });
    
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
        // Aplicar horarios de descanso de la sucursal especificada o del profesional
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

// Función auxiliar optimizada para generar slots disponibles
async function generateAvailableSlotsOptimized(professionalId, date, workingHour, serviceDuration, businessSlotDuration = 30, branchId = null, preloadedBreakTimes = []) {
  const slots = [];
  
  // Parsear horarios de trabajo
  const [startHour, startMin] = workingHour.startTime.split(':').map(Number);
  const [endHour, endMin] = workingHour.endTime.split(':').map(Number);
  
  // Crear fechas de inicio y fin para el día
  const startTime = new Date(date);
  startTime.setHours(startHour, startMin, 0, 0);
  
  const endTime = new Date(date);
  endTime.setHours(endHour, endMin, 0, 0);
  
  // OPTIMIZACIÓN: Obtener citas existentes de una vez
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      userId: professionalId,
      startTime: {
        gte: startTime,
        lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
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

  // OPTIMIZACIÓN: Usar break times pre-cargados
  let breakTimes = preloadedBreakTimes;
  
  // Si no se pasaron break times, cargarlos (fallback)
  if (!breakTimes || breakTimes.length === 0) {
    const dayOfWeek = date.getDay();
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

  // Generar slots
  let currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000);
    
    // Solo considerar slots que caben completamente antes del fin del horario laboral
    if (slotEnd > endTime) {
      break;
    }
    
    // OPTIMIZACIÓN: Verificar conflictos con citas existentes
    const isAvailableAppointments = !existingAppointments.some(appointment => {
      const appointmentStart = new Date(appointment.startTime);
      const appointmentEnd = new Date(appointment.endTime);
      
      return (
        (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
        (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
        (currentTime <= appointmentStart && slotEnd >= appointmentEnd)
      );
    });

    // OPTIMIZACIÓN: Verificar conflictos con break times
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

    // Agregar slot si está disponible
    if (isAvailableAppointments && isAvailableBreakTimes) {
      // Formatear datetime sin conversión de zona horaria
      const year = currentTime.getFullYear();
      const month = String(currentTime.getMonth() + 1).padStart(2, '0');
      const day = String(currentTime.getDate()).padStart(2, '0');
      const hours = String(currentTime.getHours()).padStart(2, '0');
      const minutes = String(currentTime.getMinutes()).padStart(2, '0');
      const datetimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      slots.push({
        datetime: datetimeString, // Formato: "2025-10-20T16:00" sin zona horaria
        time: `${hours}:${minutes}`, // HH:MM
        available: true
      });
    }

    // Avanzar al siguiente slot
    currentTime = new Date(currentTime.getTime() + businessSlotDuration * 60000);
  }

  return slots;
}

// Función auxiliar para generar slots disponibles (versión original - mantenida para compatibilidad)
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
    
    console.log(`🔍 DEBUG - Profesional ${professionalId}, BranchID: ${branchId}, BreakTimes: ${breakTimes.length}`);
  }

  // Usar la duración configurada del negocio para los slots
  const slotDuration = businessSlotDuration; // Usar configuración del negocio
  let currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000);
    
    // Solo considerar slots que caben completamente antes del fin del horario laboral
    if (slotEnd > endTime) {
      break;
    }
    
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
      
      const overlaps = (
        (currentTime >= breakStart && currentTime < breakEnd) ||
        (slotEnd > breakStart && slotEnd <= breakEnd) ||
        (currentTime <= breakStart && slotEnd >= breakEnd)
      );
      
      // Log solo el primer overlap por profesional/día para evitar spam
      if (overlaps && slots.length === 0) {
        console.log(`🚫 DEBUG - Horarios de descanso aplicados para profesional ${professionalId}`);
      }
      
      return overlaps;
    });

    // Agregar slot si está disponible (no se superpone con citas ni descansos)
    if (isAvailableAppointments && isAvailableBreakTimes) {
      // Formatear datetime sin conversión de zona horaria
      const year = currentTime.getFullYear();
      const month = String(currentTime.getMonth() + 1).padStart(2, '0');
      const day = String(currentTime.getDate()).padStart(2, '0');
      const hours = String(currentTime.getHours()).padStart(2, '0');
      const minutes = String(currentTime.getMinutes()).padStart(2, '0');
      const datetimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      slots.push({
        time: currentTime.toTimeString().slice(0, 5), // HH:MM
        datetime: datetimeString, // Formato: "2025-10-20T16:00" sin zona horaria
        available: true
      });
    }
    
    // SIEMPRE avanzar al siguiente slot, independientemente de si está disponible o no
    // Esto asegura que no saltemos slots después de horarios de descanso
    currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
  }
  
  return slots;
}

// Obtener todos los profesionales de un negocio (para modo "por profesional")
const getAllProfessionals = async (req, res) => {
  try {
    const { businessSlug } = req.params;
    const { branchId } = req.query;

    console.log('🔍 getAllProfessionals - Parámetros:', { businessSlug, branchId });

    // Buscar el negocio por slug
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      include: {
        users: {
          where: { 
            isActive: true,
            role: { in: ['EMPLOYEE', 'ADMIN'] }, // Incluir empleados y admins como profesionales
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

    console.log('✅ getAllProfessionals - Profesionales encontrados:', {
      total: business.users.length,
      professionals: business.users.map(u => ({ 
        id: u.id, 
        name: u.name, 
        role: u.role, 
        branchId: u.branchId,
        branchName: u.branch?.name 
      }))
    });

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
            banner: true,
            bannerAlt: true,
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
      banner: branch.banner,
      bannerAlt: branch.bannerAlt,
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

// Obtener turnos pendientes de evaluación (pasados pero aún en CONFIRMED)
const getPendingEvaluation = async (req, res) => {
  try {
    const businessId = req.businessId;
    const currentUser = req.user;
    
    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);
    
    const now = new Date();
    
    // Construir filtros
    const where = {
      businessId,
      branchId: { in: branchIds },
      status: 'CONFIRMED', // Solo turnos confirmados
      endTime: { lt: now } // Que ya hayan terminado
    };
    
    // 🔒 FILTRO POR ROL: Si es EMPLOYEE, solo ver sus propios turnos
    if (currentUser.role === 'EMPLOYEE') {
      where.userId = currentUser.id;
    }
    
    const pendingAppointments = await prisma.appointment.findMany({
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
            name: true
          }
        }
      },
      orderBy: {
        startTime: 'desc' // Más recientes primero
      },
      take: 50 // Limitar a 50 para no sobrecargar
    });
    
    return res.json({
      success: true,
      data: pendingAppointments,
      count: pendingAppointments.length
    });
  } catch (error) {
    console.error('Error obteniendo turnos pendientes:', error);
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
  getAvailableTimes,
  getAvailableSlots,
  getAvailableProfessionals,
  getAllProfessionals,
  getProfessionalServices,
  getBusinessServices,
  getProfessionalAvailability,
  getPublicBranches,
  getPendingEvaluation
}; 