const emailService = require('./emailService');
const { generateAppointmentConfirmationEmail } = require('../templates/email/appointmentConfirmation');
const { generateAppointmentReminderEmail } = require('../templates/email/appointmentReminder');
const { generateAppointmentCancelledEmail } = require('../templates/email/appointmentCancelled');

/**
 * Servicio de Notificaciones
 * Orquesta el envío de notificaciones por diferentes canales
 */
class NotificationService {
  constructor() {
    this.emailService = emailService;
  }

  /**
   * Envía notificación de confirmación de cita
   * @param {Object} appointment - Datos completos de la cita
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendAppointmentConfirmation(appointment) {
    try {
      console.log(`📧 Preparando email de confirmación para cita ${appointment.id}`);

      // Validar que el cliente tiene email
      if (!appointment.client.email) {
        console.log(`⚠️ Cliente ${appointment.client.name} no tiene email configurado`);
        return {
          success: false,
          error: 'NO_EMAIL',
          message: 'Cliente no tiene email configurado'
        };
      }

      // Validar email
      if (!this.emailService.isValidEmail(appointment.client.email)) {
        console.log(`⚠️ Email inválido: ${appointment.client.email}`);
        return {
          success: false,
          error: 'INVALID_EMAIL',
          message: 'Email del cliente no es válido'
        };
      }

      // Verificar configuración del negocio
      const settings = await this.emailService.getNotificationSettings(appointment.businessId);
      if (!settings.sendConfirmationEmail) {
        console.log(`⚠️ Notificaciones de confirmación deshabilitadas para negocio ${appointment.businessId}`);
        return {
          success: false,
          error: 'DISABLED',
          message: 'Notificaciones de confirmación deshabilitadas'
        };
      }

      // Generar email
      const { subject, html } = generateAppointmentConfirmationEmail(appointment);

      // Enviar con log
      const result = await this.emailService.sendEmailWithLog(
        {
          to: appointment.client.email,
          subject,
          html,
          from: settings.fromName ? `"${settings.fromName}" <${process.env.SMTP_USER}>` : undefined,
          replyTo: settings.replyToEmail || undefined
        },
        {
          businessId: appointment.businessId,
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          type: 'APPOINTMENT_CONFIRMATION',
          channel: 'EMAIL'
        }
      );

      if (result.success) {
        console.log(`✅ Email de confirmación enviado a ${appointment.client.email}`);
      } else {
        console.error(`❌ Error enviando email de confirmación: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error en sendAppointmentConfirmation:', error);
      return {
        success: false,
        error: error.code || 'UNKNOWN_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Envía notificación de recordatorio de cita
   * @param {Object} appointment - Datos completos de la cita
   * @param {number} hoursUntil - Horas hasta la cita
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendAppointmentReminder(appointment, hoursUntil = 24) {
    try {
      console.log(`📧 Preparando email de recordatorio para cita ${appointment.id}`);

      // Validaciones básicas
      if (!appointment.client.email) {
        console.log(`⚠️ Cliente ${appointment.client.name} no tiene email configurado`);
        return { success: false, error: 'NO_EMAIL' };
      }

      if (!this.emailService.isValidEmail(appointment.client.email)) {
        console.log(`⚠️ Email inválido: ${appointment.client.email}`);
        return { success: false, error: 'INVALID_EMAIL' };
      }

      // Verificar configuración
      const settings = await this.emailService.getNotificationSettings(appointment.businessId);
      if (!settings.sendReminderEmail) {
        console.log(`⚠️ Notificaciones de recordatorio deshabilitadas para negocio ${appointment.businessId}`);
        return { success: false, error: 'DISABLED' };
      }

      // Verificar que no se haya enviado recordatorio ya
      if (appointment.reminderSent) {
        console.log(`⚠️ Recordatorio ya enviado para cita ${appointment.id}`);
        return { success: false, error: 'ALREADY_SENT' };
      }

      // Generar email
      const { subject, html } = generateAppointmentReminderEmail(appointment, hoursUntil);

      // Enviar con log
      const result = await this.emailService.sendEmailWithLog(
        {
          to: appointment.client.email,
          subject,
          html,
          from: settings.fromName ? `"${settings.fromName}" <${process.env.SMTP_USER}>` : undefined,
          replyTo: settings.replyToEmail || undefined
        },
        {
          businessId: appointment.businessId,
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          type: 'APPOINTMENT_REMINDER',
          channel: 'EMAIL'
        }
      );

      if (result.success) {
        console.log(`✅ Email de recordatorio enviado a ${appointment.client.email}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error en sendAppointmentReminder:', error);
      return {
        success: false,
        error: error.code || 'UNKNOWN_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Envía notificación de cancelación de cita
   * @param {Object} appointment - Datos completos de la cita
   * @param {string} reason - Razón de cancelación (opcional)
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendAppointmentCancellation(appointment, reason = null) {
    try {
      console.log(`📧 Preparando email de cancelación para cita ${appointment.id}`);

      // Validaciones básicas
      if (!appointment.client.email) {
        console.log(`⚠️ Cliente ${appointment.client.name} no tiene email configurado`);
        return { success: false, error: 'NO_EMAIL' };
      }

      if (!this.emailService.isValidEmail(appointment.client.email)) {
        console.log(`⚠️ Email inválido: ${appointment.client.email}`);
        return { success: false, error: 'INVALID_EMAIL' };
      }

      // Verificar configuración
      const settings = await this.emailService.getNotificationSettings(appointment.businessId);
      if (!settings.sendCancellationEmail) {
        console.log(`⚠️ Notificaciones de cancelación deshabilitadas para negocio ${appointment.businessId}`);
        return { success: false, error: 'DISABLED' };
      }

      // Generar email
      const { subject, html } = generateAppointmentCancelledEmail(appointment, reason);

      // Enviar con log
      const result = await this.emailService.sendEmailWithLog(
        {
          to: appointment.client.email,
          subject,
          html,
          from: settings.fromName ? `"${settings.fromName}" <${process.env.SMTP_USER}>` : undefined,
          replyTo: settings.replyToEmail || undefined
        },
        {
          businessId: appointment.businessId,
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          type: 'APPOINTMENT_CANCELLED',
          channel: 'EMAIL'
        }
      );

      if (result.success) {
        console.log(`✅ Email de cancelación enviado a ${appointment.client.email}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error en sendAppointmentCancellation:', error);
      return {
        success: false,
        error: error.code || 'UNKNOWN_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Envía notificación de modificación de cita
   * @param {Object} appointment - Datos completos de la cita actualizada
   * @param {Object} previousData - Datos anteriores de la cita
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendAppointmentModification(appointment, previousData) {
    try {
      console.log(`📧 Preparando email de modificación para cita ${appointment.id}`);

      // Validaciones básicas
      if (!appointment.client.email) {
        console.log(`⚠️ Cliente ${appointment.client.name} no tiene email configurado`);
        return { success: false, error: 'NO_EMAIL' };
      }

      if (!this.emailService.isValidEmail(appointment.client.email)) {
        console.log(`⚠️ Email inválido: ${appointment.client.email}`);
        return { success: false, error: 'INVALID_EMAIL' };
      }

      // Verificar configuración
      const settings = await this.emailService.getNotificationSettings(appointment.businessId);
      if (!settings.sendModificationEmail) {
        console.log(`⚠️ Notificaciones de modificación deshabilitadas para negocio ${appointment.businessId}`);
        return { success: false, error: 'DISABLED' };
      }

      // Por ahora, enviamos un email de confirmación modificado
      // En el futuro se puede crear un template específico de modificación
      const { subject, html } = generateAppointmentConfirmationEmail(appointment);

      // Modificar subject para indicar que es una modificación
      const modifiedSubject = subject.replace('Cita confirmada', 'Cita modificada');

      // Enviar con log
      const result = await this.emailService.sendEmailWithLog(
        {
          to: appointment.client.email,
          subject: modifiedSubject,
          html,
          from: settings.fromName ? `"${settings.fromName}" <${process.env.SMTP_USER}>` : undefined,
          replyTo: settings.replyToEmail || undefined
        },
        {
          businessId: appointment.businessId,
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          type: 'APPOINTMENT_MODIFIED',
          channel: 'EMAIL'
        }
      );

      if (result.success) {
        console.log(`✅ Email de modificación enviado a ${appointment.client.email}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error en sendAppointmentModification:', error);
      return {
        success: false,
        error: error.code || 'UNKNOWN_ERROR',
        message: error.message
      };
    }
  }
}

// Exportar instancia única (singleton)
const notificationService = new NotificationService();

module.exports = notificationService;

