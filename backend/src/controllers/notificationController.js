const { prisma } = require('../config/database');
const emailService = require('../services/emailService');
const appointmentReminderService = require('../services/appointmentReminderService');

/**
 * Obtener configuración de notificaciones del negocio
 */
const getNotificationSettings = async (req, res) => {
  try {
    const businessId = req.businessId;

    let settings = await prisma.notificationSettings.findUnique({
      where: { businessId }
    });

    // Si no existe, crear configuración por defecto
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          businessId,
          sendConfirmationEmail: true,
          sendReminderEmail: true,
          reminderHoursBefore: 24,
          sendCancellationEmail: true,
          sendModificationEmail: true,
          sendReviewRequestEmail: true
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error obteniendo configuración de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar configuración de notificaciones
 */
const updateNotificationSettings = async (req, res) => {
  try {
    const businessId = req.businessId;
    const {
      sendConfirmationEmail,
      sendReminderEmail,
      reminderHoursBefore,
      sendCancellationEmail,
      sendModificationEmail,
      sendReviewRequestEmail,
      fromName,
      replyToEmail
    } = req.body;

    // Validar reminderHoursBefore
    if (reminderHoursBefore !== undefined) {
      const hours = parseInt(reminderHoursBefore);
      if (isNaN(hours) || hours < 1 || hours > 72) {
        return res.status(400).json({
          success: false,
          message: 'Las horas de recordatorio deben estar entre 1 y 72'
        });
      }
    }

    // Validar email si se proporciona
    if (replyToEmail && !emailService.isValidEmail(replyToEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Email de respuesta inválido'
      });
    }

    const updateData = {};
    if (sendConfirmationEmail !== undefined) updateData.sendConfirmationEmail = sendConfirmationEmail;
    if (sendReminderEmail !== undefined) updateData.sendReminderEmail = sendReminderEmail;
    if (reminderHoursBefore !== undefined) updateData.reminderHoursBefore = parseInt(reminderHoursBefore);
    if (sendCancellationEmail !== undefined) updateData.sendCancellationEmail = sendCancellationEmail;
    if (sendModificationEmail !== undefined) updateData.sendModificationEmail = sendModificationEmail;
    if (sendReviewRequestEmail !== undefined) updateData.sendReviewRequestEmail = sendReviewRequestEmail;
    if (fromName !== undefined) updateData.fromName = fromName;
    if (replyToEmail !== undefined) updateData.replyToEmail = replyToEmail;

    // Actualizar o crear si no existe
    const settings = await prisma.notificationSettings.upsert({
      where: { businessId },
      update: updateData,
      create: {
        businessId,
        ...updateData
      }
    });

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: settings
    });
  } catch (error) {
    console.error('Error actualizando configuración de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener historial de notificaciones enviadas
 */
const getNotificationHistory = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { page = 1, limit = 50, type, status, clientId, appointmentId } = req.query;

    const where = { businessId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (appointmentId) where.appointmentId = appointmentId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          appointment: {
            select: {
              id: true,
              startTime: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.notificationLog.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo historial de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener estadísticas de notificaciones
 */
const getNotificationStats = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { period = '7d' } = req.query;

    // Calcular fecha de inicio según el período
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const where = {
      businessId,
      createdAt: { gte: startDate }
    };

    // Estadísticas generales
    const [total, sent, failed, pending, byType, byStatus] = await Promise.all([
      prisma.notificationLog.count({ where }),
      prisma.notificationLog.count({ where: { ...where, status: 'SENT' } }),
      prisma.notificationLog.count({ where: { ...where, status: 'FAILED' } }),
      prisma.notificationLog.count({ where: { ...where, status: 'PENDING' } }),
      
      // Por tipo
      prisma.notificationLog.groupBy({
        by: ['type'],
        where,
        _count: true
      }),
      
      // Por estado
      prisma.notificationLog.groupBy({
        by: ['status'],
        where,
        _count: true
      })
    ]);

    // Calcular tasa de éxito
    const successRate = total > 0 ? ((sent / total) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        period,
        summary: {
          total,
          sent,
          failed,
          pending,
          successRate: parseFloat(successRate)
        },
        byType: byType.map(item => ({
          type: item.type,
          count: item._count
        })),
        byStatus: byStatus.map(item => ({
          status: item.status,
          count: item._count
        }))
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Enviar email de prueba
 */
const sendTestEmail = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { email, type = 'APPOINTMENT_CONFIRMATION' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    if (!emailService.isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    // Obtener negocio
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    // Crear email de prueba
    const { generateEmailBase } = require('../templates/email/common/base');
    const { styles } = require('../templates/email/common/styles');

    const content = `
      <h2 style="${styles.contentTitle}">¡Email de Prueba!</h2>
      
      <p style="${styles.paragraph}">
        Este es un email de prueba del sistema de notificaciones de <strong>${business.name}</strong>.
      </p>

      <div style="${styles.alertSuccess}">
        ✅ Si recibes este email, significa que tu configuración SMTP está funcionando correctamente.
      </div>

      <div style="${styles.detailsBox}">
        <h3 style="${styles.detailsTitle}">Detalles de la configuración</h3>
        <div style="${styles.detailItem}">
          <span style="${styles.detailLabel}">Servidor SMTP:</span>
          <span style="${styles.detailValue}">${process.env.SMTP_HOST || 'No configurado'}</span>
        </div>
        <div style="${styles.detailItem}">
          <span style="${styles.detailLabel}">Puerto:</span>
          <span style="${styles.detailValue}">${process.env.SMTP_PORT || '587'}</span>
        </div>
        <div style="${styles.detailItem}">
          <span style="${styles.detailLabel}">Usuario:</span>
          <span style="${styles.detailValue}">${process.env.SMTP_USER || 'No configurado'}</span>
        </div>
      </div>

      <p style="${styles.paragraph}">
        Puedes comenzar a enviar notificaciones automáticas a tus clientes.
      </p>
    `;

    const html = generateEmailBase({
      title: 'Email de Prueba',
      subtitle: 'Sistema de Notificaciones TurnIO',
      content,
      business,
      preheader: 'Prueba de configuración de email'
    });

    // Enviar email
    const result = await emailService.sendEmail({
      to: email,
      subject: `📧 Email de Prueba - ${business.name}`,
      html
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Email de prueba enviado exitosamente',
        data: {
          messageId: result.messageId,
          recipient: email
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error enviando email de prueba',
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error enviando email de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Enviar recordatorio manual para una cita
 */
const sendManualReminder = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const businessId = req.businessId;

    // Verificar que la cita pertenece al negocio
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        businessId
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Enviar recordatorio
    const result = await appointmentReminderService.sendManualReminder(appointmentId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Recordatorio enviado exitosamente',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error enviando recordatorio',
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error enviando recordatorio manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationHistory,
  getNotificationStats,
  sendTestEmail,
  sendManualReminder
};

