const { generateEmailBase, generateAppointmentDetails, generateButton, generateAlert } = require('./common/base');
const { styles } = require('./common/styles');

/**
 * Template de email para recordatorio de cita
 * @param {Object} appointment - Datos completos de la cita
 * @param {number} hoursUntil - Horas hasta la cita
 * @returns {Object} { subject, html }
 */
const generateAppointmentReminderEmail = (appointment, hoursUntil = 24) => {
  const { business, client, service, branch, startTime } = appointment;
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const confirmUrl = `${frontendUrl}/appointment/${appointment.id}/confirm`;
  const rescheduleUrl = `${frontendUrl}/appointment/${appointment.id}/reschedule`;
  
  // Formatear fecha para el subject
  const appointmentDate = new Date(startTime);
  const formattedDateShort = appointmentDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
  const formattedTime = appointmentDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Determinar el mensaje según las horas
  let timeMessage = `en ${hoursUntil} horas`;
  if (hoursUntil >= 24 && hoursUntil < 48) {
    timeMessage = 'mañana';
  } else if (hoursUntil < 12) {
    timeMessage = 'en pocas horas';
  } else if (hoursUntil < 2) {
    timeMessage = '¡muy pronto!';
  }

  const subject = `⏰ Recordatorio: Tu cita ${timeMessage} - ${business.name}`;
  
  const preheader = `No olvides tu cita de ${service.name} el ${formattedDateShort} a las ${formattedTime}`;

  const content = `
    <h2 style="${styles.contentTitle}">⏰ Recordatorio de cita</h2>
    
    <p style="${styles.paragraph}">
      Hola <strong>${client.name}</strong>,
    </p>

    <p style="${styles.paragraph}">
      Te recordamos que tienes una cita programada ${timeMessage}.
    </p>

    ${generateAlert({
      text: `Tu cita es ${timeMessage}`,
      type: 'warning'
    })}

    ${generateAppointmentDetails(appointment)}

    <div style="${styles.buttonContainer}">
      ${generateButton({
        text: '✅ Confirmar Asistencia',
        url: confirmUrl,
        style: 'primary'
      })}
    </div>

    <hr style="${styles.divider}">

    <h3 style="color: #333; font-size: 18px; margin-top: 30px;">¿No puedes asistir?</h3>
    
    <p style="${styles.paragraph}">
      Si tuviste algún imprevisto y no puedes asistir, por favor avísanos 
      lo antes posible para que podamos ofrecer tu horario a otros clientes.
    </p>

    ${branch?.phone ? `
    <div style="text-align: center; margin: 20px 0;">
      <a href="tel:${branch.phone}" style="${styles.buttonSecondary}">
        📞 Llamar para cancelar
      </a>
    </div>
    ` : business.phone ? `
    <div style="text-align: center; margin: 20px 0;">
      <a href="tel:${business.phone}" style="${styles.buttonSecondary}">
        📞 Llamar para cancelar
      </a>
    </div>
    ` : ''}

    ${generateAlert({
      text: 'Recuerda: Las cancelaciones con menos de 24 horas de anticipación pueden afectar tu historial',
      type: 'info'
    })}

    ${branch?.address ? `
    <h3 style="color: #333; font-size: 18px; margin-top: 30px;">📍 ¿Cómo llegar?</h3>
    
    <p style="${styles.paragraph}">
      <strong>${branch.name}</strong><br>
      ${branch.address}
    </p>

    ${branch.latitude && branch.longitude ? `
    <div style="text-align: center; margin: 20px 0;">
      <a href="https://www.google.com/maps?q=${branch.latitude},${branch.longitude}" 
         style="${styles.buttonOutline}"
         target="_blank">
        🗺️ Ver en Google Maps
      </a>
    </div>
    ` : ''}
    ` : ''}

    <p style="${styles.paragraph}; margin-top: 30px;">
      ¡Te esperamos! 😊
    </p>
  `;

  const html = generateEmailBase({
    title: 'Recordatorio de Cita',
    subtitle: `${business.name}`,
    content,
    business,
    preheader
  });

  return { subject, html };
};

module.exports = {
  generateAppointmentReminderEmail
};

