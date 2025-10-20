const { styles, getInlineStyles } = require('./styles');

/**
 * Genera el layout base de un email
 * @param {Object} options - Opciones del email
 * @param {string} options.title - Título del header
 * @param {string} options.subtitle - Subtítulo del header
 * @param {string} options.content - Contenido HTML del email
 * @param {Object} options.business - Información del negocio
 * @param {string} options.preheader - Texto de preheader (preview)
 * @returns {string} HTML completo del email
 */
const generateEmailBase = ({
  title,
  subtitle = '',
  content,
  business,
  preheader = ''
}) => {
  const currentYear = new Date().getFullYear();
  const businessName = business?.name || 'TurnIO';
  const businessPhone = business?.phone || '';
  const businessAddress = business?.address || '';
  const businessEmail = business?.email || '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  ${getInlineStyles()}
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  
  <!-- Preheader text (oculto pero visible en preview) -->
  ${preheader ? `
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f5f5f5;">
    ${preheader}
  </div>
  ` : ''}

  <!-- Spacer para mejor visualización -->
  <div style="height: 20px;"></div>

  <!-- Contenedor principal -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 0;">
        
        <!-- Email Container -->
        <div style="${styles.container}">
          
          <!-- Header -->
          <div style="${styles.header}">
            ${business?.logo ? `
            <img src="${business.logo}" alt="${businessName}" style="max-width: 150px; height: auto; margin-bottom: 20px;">
            ` : ''}
            <h1 style="${styles.headerTitle}">${title}</h1>
            ${subtitle ? `<p style="${styles.headerSubtitle}">${subtitle}</p>` : ''}
          </div>

          <!-- Content -->
          <div style="${styles.content}">
            ${content}
          </div>

          <!-- Footer -->
          <div style="${styles.footer}">
            <p style="${styles.footerTitle}">${businessName}</p>
            
            ${businessPhone ? `
            <p style="${styles.footerText}">
              📞 <a href="tel:${businessPhone}" style="${styles.footerLink}">${businessPhone}</a>
            </p>
            ` : ''}
            
            ${businessAddress ? `
            <p style="${styles.footerText}">
              📍 ${businessAddress}
            </p>
            ` : ''}
            
            ${businessEmail ? `
            <p style="${styles.footerText}">
              ✉️ <a href="mailto:${businessEmail}" style="${styles.footerLink}">${businessEmail}</a>
            </p>
            ` : ''}

            <hr style="${styles.divider}">

            <p style="${styles.small}">
              Este es un email automático generado por ${businessName}.<br>
              Por favor no respondas directamente a este correo.
            </p>

            <p style="${styles.small}">
              © ${currentYear} ${businessName}. Todos los derechos reservados.<br>
              Powered by <strong>TurnIO</strong>
            </p>
          </div>

        </div>
        
      </td>
    </tr>
  </table>

  <!-- Spacer final -->
  <div style="height: 40px;"></div>

</body>
</html>
  `.trim();
};

/**
 * Genera el contenido de detalles de una cita
 * @param {Object} appointment - Datos de la cita
 * @returns {string} HTML de los detalles
 */
const generateAppointmentDetails = (appointment) => {
  const { client, service, user, branch, startTime, endTime } = appointment;
  
  // Formatear fecha y hora
  const appointmentDate = new Date(startTime);
  const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = appointmentDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const endTimeObj = new Date(endTime);
  const formattedEndTime = endTimeObj.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <div style="${styles.detailsBox}">
      <h3 style="${styles.detailsTitle}">📅 Detalles de tu cita</h3>
      
      <div style="${styles.detailItem}">
        <span style="${styles.detailLabel}">🗓️ Fecha:</span>
        <span style="${styles.detailValue}">${formattedDate}</span>
      </div>

      <div style="${styles.detailItem}">
        <span style="${styles.detailLabel}">⏰ Hora:</span>
        <span style="${styles.detailValue}">${formattedTime} - ${formattedEndTime}</span>
      </div>

      <div style="${styles.detailItem}">
        <span style="${styles.detailLabel}">💈 Servicio:</span>
        <span style="${styles.detailValue}">${service.name}</span>
      </div>

      ${service.price ? `
      <div style="${styles.detailItem}">
        <span style="${styles.detailLabel}">💰 Precio:</span>
        <span style="${styles.detailValue}">$${service.price.toFixed(2)}</span>
      </div>
      ` : ''}

      ${user ? `
      <div style="${styles.detailItem}">
        <span style="${styles.detailLabel}">👤 Profesional:</span>
        <span style="${styles.detailValue}">${user.name}</span>
      </div>
      ` : ''}

      ${branch ? `
      <div style="${styles.detailItem}">
        <span style="${styles.detailLabel}">📍 Sucursal:</span>
        <span style="${styles.detailValue}">${branch.name}${branch.address ? ` - ${branch.address}` : ''}</span>
      </div>
      ` : ''}
    </div>
  `;
};

/**
 * Genera un botón de acción
 * @param {Object} options - Opciones del botón
 * @param {string} options.text - Texto del botón
 * @param {string} options.url - URL del botón
 * @param {string} options.style - Estilo del botón (primary, secondary, outline)
 * @returns {string} HTML del botón
 */
const generateButton = ({ text, url, style = 'primary' }) => {
  let buttonStyle = styles.buttonPrimary;
  
  if (style === 'secondary') {
    buttonStyle = styles.buttonSecondary;
  } else if (style === 'outline') {
    buttonStyle = styles.buttonOutline;
  }

  return `
    <div style="${styles.buttonContainer}">
      <a href="${url}" style="${buttonStyle}" target="_blank">
        ${text}
      </a>
    </div>
  `;
};

/**
 * Genera un alert/aviso
 * @param {Object} options - Opciones del alert
 * @param {string} options.text - Texto del alert
 * @param {string} options.type - Tipo del alert (info, warning, success)
 * @returns {string} HTML del alert
 */
const generateAlert = ({ text, type = 'info' }) => {
  let alertStyle = styles.alertInfo;
  let icon = 'ℹ️';

  if (type === 'warning') {
    alertStyle = styles.alertWarning;
    icon = '⚠️';
  } else if (type === 'success') {
    alertStyle = styles.alertSuccess;
    icon = '✅';
  }

  return `
    <div style="${alertStyle}">
      <strong>${icon} ${text}</strong>
    </div>
  `;
};

module.exports = {
  generateEmailBase,
  generateAppointmentDetails,
  generateButton,
  generateAlert
};

