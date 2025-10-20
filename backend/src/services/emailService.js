const nodemailer = require('nodemailer');
const { prisma } = require('../config/database');

/**
 * Servicio Centralizado de Emails
 * Configurado para usar Mailgun SMTP
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  /**
   * Inicializa el transporter de nodemailer con configuración de Mailgun
   */
  initializeTransporter() {
    try {
      // Validar configuración
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP no configurado. Variables faltantes: SMTP_HOST, SMTP_USER o SMTP_PASS');
        return;
      }

      // Configuración para Mailgun SMTP
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST, // smtp.mailgun.org para US, smtp.eu.mailgun.org para EU
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true para 465, false para otros puertos
        auth: {
          user: process.env.SMTP_USER, // postmaster@tu-dominio.mailgun.org
          pass: process.env.SMTP_PASS  // Tu API Key de Mailgun
        },
        // Configuraciones adicionales para Mailgun
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        }
      });

      this.isConfigured = true;
      console.log('✅ EmailService configurado correctamente con Mailgun');
      
      // Verificar configuración al iniciar
      this.verifyConnection();
    } catch (error) {
      console.error('❌ Error inicializando EmailService:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Verifica la conexión SMTP
   */
  async verifyConnection() {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      console.log('✅ Conexión SMTP verificada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error verificando conexión SMTP:', error.message);
      return false;
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
    if (!this.isConfigured || !this.transporter) {
      console.error('❌ EmailService no configurado. Verifica variables de entorno SMTP.');
      return {
        success: false,
        error: 'SMTP_NOT_CONFIGURED',
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
      const fromEmail = from || process.env.SMTP_USER;
      
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html), // Fallback a texto plano
        replyTo: replyTo || process.env.EMAIL_REPLY_TO || fromEmail
      };

      console.log(`📧 Enviando email a ${to} - Asunto: ${subject}`);
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Email enviado exitosamente - MessageID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('❌ Error enviando email:', {
        to,
        subject,
        error: error.message,
        stack: error.stack
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

