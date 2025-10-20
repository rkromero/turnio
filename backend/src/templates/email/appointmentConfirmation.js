const { generateEmailBase, generateAppointmentDetails, generateButton, generateAlert } = require('./common/base');
const { styles } = require('./common/styles');

/**
 * Template de email para confirmación de cita
 * @param {Object} appointment - Datos completos de la cita
 * @param {Object} appointment.business - Datos del negocio
 * @param {Object} appointment.client - Datos del cliente
 * @param {Object} appointment.service - Datos del servicio
 * @param {Object} appointment.user - Datos del profesional
 * @param {Object} appointment.branch - Datos de la sucursal
 * @returns {Object} { subject, html }
 */
const generateAppointmentConfirmationEmail = (appointment) => {
  const { business, client, service, branch, startTime } = appointment;
  
  // URL del frontend para ver/gestionar la cita
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const viewAppointmentUrl = `${frontendUrl}/appointment/${appointment.id}`;
  
  // Formatear fecha para el subject
  const appointmentDate = new Date(startTime);
  const formattedDateShort = appointmentDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const subject = `✅ Cita confirmada en ${business.name} - ${formattedDateShort}`;
  
  const preheader = `Tu cita para ${service.name} ha sido confirmada exitosamente`;

  const content = `
    <h2 style="${styles.contentTitle}">¡Tu cita está confirmada!</h2>
    
    <p style="${styles.paragraph}">
      Hola <strong>${client.name}</strong>,
    </p>

    <p style="${styles.paragraph}">
      Tu cita ha sido confirmada exitosamente. A continuación encontrarás todos los detalles:
    </p>

    ${generateAppointmentDetails(appointment)}

    ${generateButton({
      text: '📅 Agregar a mi Calendario',
      url: `${frontendUrl}/api/appointments/${appointment.id}/calendar`,
      style: 'primary'
    })}

    ${generateAlert({
      text: 'Por favor llega 5-10 minutos antes de tu cita',
      type: 'info'
    })}

    <hr style="${styles.divider}">

    <h3 style="color: #333; font-size: 18px; margin-top: 30px;">¿Necesitas hacer cambios?</h3>
    
    <p style="${styles.paragraph}">
      Si necesitas reprogramar o cancelar tu cita, por favor comunícate con nosotros 
      lo antes posible.
    </p>

    ${branch?.phone ? `
    <div style="${styles.detailItem}">
      <span style="${styles.icon}">📞</span>
      <a href="tel:${branch.phone}" style="${styles.footerLink}">${branch.phone}</a>
    </div>
    ` : business.phone ? `
    <div style="${styles.detailItem}">
      <span style="${styles.icon}">📞</span>
      <a href="tel:${business.phone}" style="${styles.footerLink}">${business.phone}</a>
    </div>
    ` : ''}

    <p style="${styles.paragraph}; margin-top: 30px;">
      <strong>Política de cancelación:</strong> Te pedimos que si no puedes asistir, 
      nos avises con al menos 24 horas de anticipación para que otros clientes 
      puedan aprovechar el turno.
    </p>

    <p style="${styles.paragraph}">
      ¡Esperamos verte pronto! 🎉
    </p>
  `;

  const html = generateEmailBase({
    title: '¡Cita Confirmada!',
    subtitle: `${business.name}`,
    content,
    business,
    preheader
  });

  return { subject, html };
};

module.exports = {
  generateAppointmentConfirmationEmail
};

