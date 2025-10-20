const formData = require('form-data');
const Mailgun = require('mailgun.js');
const { prisma } = require('../config/database');

/**
 * Servicio Centralizado de Emails
 * Configurado para usar Mailgun API
 */
class EmailService {
  constructor() {
    this.mg = null;
    this.isConfigured = false;
    this.domain = null;
    this.fromEmail = null;
    this.initialize();
  }

  /**
   * Inicializa el cliente de Mailgun
   */
  initialize() {
    try {
      // Validar configuración
      if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !process.env.EMAIL_FROM) {
        console.warn('⚠️ Mailgun no configurado. Variables faltantes: MAILGUN_API_KEY, MAILGUN_DOMAIN o EMAIL_FROM');
        return;
      }

      const mailgun = new Mailgun(formData);
      this.mg = mailgun.client({
        username: 'api',
        key: process.env.MAILGUN_API_KEY,
        url: process.env.MAILGUN_API_BASE_URL || 'https://api.mailgun.net' // 'https://api.eu.mailgun.net' para EU
      });

      this.domain = process.env.MAILGUN_DOMAIN;
      this.fromEmail = process.env.EMAIL_FROM;
      this.isConfigured = true;

      console.log('✅ EmailService configurado correctamente con Mailgun');
      console.log(`   📧 Dominio: ${this.domain}`);
      console.log(`   ✉️  From: ${this.fromEmail}`);
    } catch (error) {
      console.error('❌ Error inicializando EmailService:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Envía un email genérico
   * @param {Object} options - Opciones del email
   * @param {string} options.to - Destinatario
   * @param {string} options.subject - Asunto
   * @param {string} options.html - Contenido HTML
   * @param {string} options.text - Contenido texto plano (opcional)
   * @param {string} options.from - Remitente (opcional)
   * @param {string} options.replyTo - Email de respuesta (opcional)
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendEmail({ to, subject, html, text, from, replyTo }) {
    if (!this.isConfigured || !this.mg) {
      console.error('❌ EmailService no configurado. Verifica variables de entorno Mailgun.');
      return {
        success: false,
        error: 'MAILGUN_NOT_CONFIGURED',
        message: 'Servicio de email no configurado'
      };
    }

    if (!to || !subject || !html) {
      console.error('❌ Faltan parámetros requeridos: to, subject, html');
      return {
        success: false,
        error: 'MISSING_PARAMETERS',
        message: 'Faltan parámetros requeridos'
      };
    }

    try {
      const fromName = process.env.EMAIL_FROM_NAME || 'TurnIO';
      const fromAddress = from || this.fromEmail;
      
      const messageData = {
        from: `${fromName} <${fromAddress}>`,
        to: [to],
        subject,
        html,
        text: text || this.stripHtml(html),
        'h:Reply-To': replyTo || process.env.EMAIL_REPLY_TO || fromAddress
      };

      console.log(`📧 Enviando email a ${to} - Asunto: ${subject}`);
      
      const response = await this.mg.messages.create(this.domain, messageData);
      
      console.log(`✅ Email enviado exitosamente - ID: ${response.id}`);
      
      return {
        success: true,
        messageId: response.id,
        response: response.message
      };
    } catch (error) {
      console.error('❌ Error enviando email:', {
        to,
        subject,
        error: error.message,
        details: error.details || error
      });
      
      return {
        success: false,
        error: error.code || 'SEND_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Envía un email y registra el log en la base de datos
   * @param {Object} emailData - Datos del email
   * @param {Object} logData - Datos para el log
   * @returns {Promise<Object>} Resultado del envío con ID del log
   */
  async sendEmailWithLog(emailData, logData) {
    const {
      businessId,
      appointmentId = null,
      clientId = null,
      type,
      channel = 'EMAIL'
    } = logData;

    // Crear log inicial
    let notificationLog;
    try {
      notificationLog = await prisma.notificationLog.create({
        data: {
          businessId,
          appointmentId,
          clientId,
          type,
          channel,
          status: 'PENDING',
          recipient: emailData.to,
          subject: emailData.subject,
          content: type, // El tipo sirve como referencia del template usado
          retryCount: 0
        }
      });

      console.log(`📝 Log de notificación creado: ${notificationLog.id}`);
    } catch (error) {
      console.error('❌ Error creando log de notificación:', error);
      // Continuar con el envío aunque falle el log
    }

    // Intentar enviar el email
    const result = await this.sendEmail(emailData);

    // Actualizar log con resultado
    if (notificationLog) {
      try {
        await prisma.notificationLog.update({
          where: { id: notificationLog.id },
          data: {
            status: result.success ? 'SENT' : 'FAILED',
            sentAt: result.success ? new Date() : null,
            failureReason: result.success ? null : result.message
          }
        });
      } catch (error) {
        console.error('❌ Error actualizando log de notificación:', error);
      }
    }

    return {
      ...result,
      logId: notificationLog?.id
    };
  }

  /**
   * Reintenta enviar un email fallido
   * @param {string} logId - ID del log de notificación
   * @returns {Promise<Object>} Resultado del reintento
   */
  async retryEmail(logId) {
    try {
      const log = await prisma.notificationLog.findUnique({
        where: { id: logId },
        include: {
          appointment: {
            include: {
              business: true,
              client: true,
              service: true,
              user: true,
              branch: true
            }
          }
        }
      });

      if (!log) {
        return { success: false, error: 'LOG_NOT_FOUND' };
      }

      if (log.retryCount >= 3) {
        console.log(`⚠️ Máximo de reintentos alcanzado para log ${logId}`);
        return { success: false, error: 'MAX_RETRIES_REACHED' };
      }

      // Incrementar contador de reintentos
      await prisma.notificationLog.update({
        where: { id: logId },
        data: {
          retryCount: log.retryCount + 1,
          status: 'RETRY'
        }
      });

      console.log(`🔄 Reintentando envío de email - Intento ${log.retryCount + 1}/3`);

      // Aquí se debería regenerar el email según el tipo
      // Por ahora retornamos false para implementar en siguientes pasos
      return { success: false, error: 'RETRY_NOT_IMPLEMENTED' };
    } catch (error) {
      console.error('❌ Error en reintento de email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene configuración de notificaciones del negocio
   * @param {string} businessId - ID del negocio
   * @returns {Promise<Object>} Configuración de notificaciones
   */
  async getNotificationSettings(businessId) {
    try {
      let settings = await prisma.notificationSettings.findUnique({
        where: { businessId }
      });

      // Si no existe, crear configuración por defecto
      if (!settings) {
        console.log(`📝 Creando configuración de notificaciones por defecto para negocio ${businessId}`);
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

      return settings;
    } catch (error) {
      console.error('❌ Error obteniendo configuración de notificaciones:', error);
      // Retornar configuración por defecto en caso de error
      return {
        sendConfirmationEmail: true,
        sendReminderEmail: true,
        reminderHoursBefore: 24,
        sendCancellationEmail: true,
        sendModificationEmail: true,
        sendReviewRequestEmail: true
      };
    }
  }

  /**
   * Elimina tags HTML de un string (para texto plano)
   * @param {string} html - HTML a limpiar
   * @returns {string} Texto plano
   */
  stripHtml(html) {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Valida que un email sea válido
   * @param {string} email - Email a validar
   * @returns {boolean} True si es válido
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Exportar instancia única (singleton)
const emailService = new EmailService();

module.exports = emailService;
