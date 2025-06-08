const { prisma } = require('../config/database');
const nodemailer = require('nodemailer');

// Configurar transportador de email
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Template de email para solicitud de reseña
const getReviewEmailTemplate = (appointment, reviewLink) => {
  const { business, client, service } = appointment;
  
  return {
    subject: `¿Cómo fue tu experiencia en ${business.name}?`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Reseña tu experiencia</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px 20px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .stars { font-size: 24px; margin: 20px 0; text-align: center; }
          .star { color: #ddd; cursor: pointer; margin: 0 5px; }
          .star.active { color: #ffd700; }
          .btn { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; text-align: center; }
          .btn:hover { background: #5a67d8; }
          .appointment-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Hola ${client.name}!</h1>
            <p>Esperamos que hayas disfrutado tu experiencia en ${business.name}</p>
          </div>
          
          <div class="content">
            <h2>¿Cómo fue tu experiencia?</h2>
            <p>Tu opinión es muy importante para nosotros y nos ayuda a mejorar nuestros servicios.</p>
            
            <div class="appointment-details">
              <h3>Detalles de tu cita:</h3>
              <p><strong>Servicio:</strong> ${service.name}</p>
              <p><strong>Fecha:</strong> ${new Date(appointment.startTime).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              ${appointment.user ? `<p><strong>Profesional:</strong> ${appointment.user.name}</p>` : ''}
            </div>
            
            <div style="text-align: center;">
              <p><strong>¿Qué tal estuvo todo?</strong></p>
              <div class="stars">
                ⭐⭐⭐⭐⭐
              </div>
              <a href="${reviewLink}" class="btn">Escribir Reseña</a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Solo te tomará un minuto y nos ayudará mucho a seguir mejorando. 
              ¡Muchas gracias por elegirnos!
            </p>
          </div>
          
          <div class="footer">
            <p>${business.name}</p>
            ${business.phone ? `<p>📞 ${business.phone}</p>` : ''}
            ${business.address ? `<p>📍 ${business.address}</p>` : ''}
            <p style="margin-top: 20px; font-size: 11px;">
              Este email fue enviado automáticamente. Si no deseas recibir más emails como este, 
              puedes ignorar este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// Enviar email de solicitud de reseña
const sendReviewRequestEmail = async (appointment) => {
  try {
    if (!appointment.client.email) {
      console.log(`Cliente ${appointment.client.name} no tiene email configurado`);
      return false;
    }

    const reviewLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/review/${appointment.id}`;
    const emailTemplate = getReviewEmailTemplate(appointment, reviewLink);
    
    const transporter = createTransporter();
    
    await transporter.sendMail({
      from: `"${appointment.business.name}" <${process.env.SMTP_USER}>`,
      to: appointment.client.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });

    // Marcar como enviado
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { reviewRequestSent: true }
    });

    console.log(`✅ Email de reseña enviado a ${appointment.client.email} para cita ${appointment.id}`);
    return true;

  } catch (error) {
    console.error('❌ Error enviando email de reseña:', error);
    return false;
  }
};

// Procesar citas completadas que necesitan solicitud de reseña
const processReviewRequests = async () => {
  try {
    console.log('🔄 Procesando solicitudes de reseña automáticas...');

    // Buscar citas completadas hace 2 horas que no han recibido solicitud de reseña
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'COMPLETED',
        reviewRequestSent: false,
        endTime: {
          gte: oneDayAgo, // No más de 24 horas
          lte: twoHoursAgo // Al menos 2 horas
        }
      },
      include: {
        business: true,
        client: true,
        service: true,
        user: true,
        review: true
      }
    });

    console.log(`📧 Encontradas ${appointments.length} citas para solicitar reseña`);

    let sentCount = 0;
    for (const appointment of appointments) {
      // Solo enviar si no tiene reseña ya
      if (!appointment.review) {
        const sent = await sendReviewRequestEmail(appointment);
        if (sent) sentCount++;
        
        // Pequeña pausa entre emails para evitar spam
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Marcar como enviado si ya tiene reseña
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reviewRequestSent: true }
        });
      }
    }

    console.log(`✅ Proceso completado: ${sentCount} emails de reseña enviados`);
    return sentCount;

  } catch (error) {
    console.error('❌ Error procesando solicitudes de reseña:', error);
    return 0;
  }
};

// Iniciar proceso automático cada 30 minutos
const startReviewNotificationService = () => {
  console.log('🚀 Iniciando servicio de notificaciones de reseña...');
  
  // Ejecutar inmediatamente
  processReviewRequests();
  
  // Ejecutar cada 30 minutos
  setInterval(processReviewRequests, 30 * 60 * 1000);
};

module.exports = {
  sendReviewRequestEmail,
  processReviewRequests,
  startReviewNotificationService
}; 