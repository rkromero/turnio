const { generateEmailBase, generateAppointmentDetails, generateButton, generateAlert } = require('./common/base');
const { styles } = require('./common/styles');

/**
 * Template de email para cancelación de cita
 * @param {Object} appointment - Datos completos de la cita
 * @param {string} reason - Razón de la cancelación (opcional)
 * @returns {Object} { subject, html }
 */
const generateAppointmentCancelledEmail = (appointment, reason = null) => {
  const { business, client, service, startTime } = appointment;
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const bookingUrl = `${frontendUrl}/book/${business.slug}`;
  
  // Formatear fecha para el subject
  const appointmentDate = new Date(startTime);
  const formattedDateShort = appointmentDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const subject = `❌ Cita cancelada - ${business.name} (${formattedDateShort})`;
  
  const preheader = `Tu cita de ${service.name} ha sido cancelada`;

  const content = `
    <h2 style="${styles.contentTitle}">Cita Cancelada</h2>
    
    <p style="${styles.paragraph}">
      Hola <strong>${client.name}</strong>,
    </p>

    <p style="${styles.paragraph}">
      Te confirmamos que tu cita ha sido <strong>cancelada</strong>.
    </p>

    ${generateAlert({
      text: 'Esta cita ha sido cancelada y el horario está nuevamente disponible',
      type: 'warning'
    })}

    ${generateAppointmentDetails(appointment)}

    ${reason ? `
    <div style="${styles.alertInfo}">
      <p style="margin: 0;">
        <strong>Motivo de la cancelación:</strong><br>
        ${reason}
      </p>
    </div>
    ` : ''}

    <hr style="${styles.divider}">

    <h3 style="color: #333; font-size: 18px; margin-top: 30px;">¿Quieres agendar una nueva cita?</h3>
    
    <p style="${styles.paragraph}">
      Estamos disponibles para atenderte en otro horario que te resulte más conveniente. 
      Puedes agendar una nueva cita en línea cuando lo desees.
    </p>

    ${generateButton({
      text: '📅 Agendar Nueva Cita',
      url: bookingUrl,
      style: 'primary'
    })}

    <p style="${styles.paragraph}; margin-top: 30px;">
      Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos:
    </p>

    ${business.phone ? `
    <div style="${styles.detailItem}; text-align: center;">
      <span style="${styles.icon}">📞</span>
      <a href="tel:${business.phone}" style="${styles.footerLink}">${business.phone}</a>
    </div>
    ` : ''}

    ${business.email ? `
    <div style="${styles.detailItem}; text-align: center;">
      <span style="${styles.icon}">✉️</span>
      <a href="mailto:${business.email}" style="${styles.footerLink}">${business.email}</a>
    </div>
    ` : ''}

    <p style="${styles.paragraph}; margin-top: 30px;">
      Esperamos verte pronto. 👋
    </p>
  `;

  const html = generateEmailBase({
    title: 'Cita Cancelada',
    subtitle: `${business.name}`,
    content,
    business,
    preheader
  });

  return { subject, html };
};

module.exports = {
  generateAppointmentCancelledEmail
};

