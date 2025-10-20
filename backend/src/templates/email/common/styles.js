/**
 * Estilos CSS inline para emails
 * Compatible con la mayoría de clientes de email
 */

const styles = {
  // Contenedor principal
  container: `
    max-width: 600px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333333;
  `,

  // Header con gradiente
  header: `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    padding: 40px 20px;
    text-align: center;
    border-radius: 10px 10px 0 0;
  `,

  headerTitle: `
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 10px;
  `,

  headerSubtitle: `
    margin: 0;
    font-size: 16px;
    font-weight: 400;
    opacity: 0.95;
  `,

  // Contenido principal
  content: `
    background: #ffffff;
    padding: 40px 30px;
    border-radius: 0 0 10px 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `,

  contentTitle: `
    color: #333333;
    font-size: 24px;
    font-weight: 600;
    margin-top: 0;
    margin-bottom: 20px;
  `,

  // Caja de detalles
  detailsBox: `
    background: #f8f9fa;
    border-left: 4px solid #667eea;
    padding: 20px;
    border-radius: 8px;
    margin: 25px 0;
  `,

  detailsTitle: `
    color: #667eea;
    font-size: 18px;
    font-weight: 600;
    margin-top: 0;
    margin-bottom: 15px;
  `,

  detailItem: `
    margin: 12px 0;
    font-size: 15px;
    color: #333333;
  `,

  detailLabel: `
    font-weight: 600;
    color: #555555;
    display: inline-block;
    min-width: 120px;
  `,

  detailValue: `
    color: #333333;
  `,

  // Iconos
  icon: `
    display: inline-block;
    margin-right: 8px;
    font-size: 16px;
  `,

  // Botones
  buttonContainer: `
    text-align: center;
    margin: 30px 0;
  `,

  buttonPrimary: `
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    padding: 16px 40px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    transition: transform 0.2s;
  `,

  buttonSecondary: `
    display: inline-block;
    background: #ffffff;
    color: #667eea;
    padding: 14px 35px;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 15px;
    border: 2px solid #667eea;
    margin-left: 10px;
  `,

  buttonOutline: `
    display: inline-block;
    background: transparent;
    color: #667eea;
    padding: 12px 30px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    border: 1px solid #667eea;
  `,

  // Alertas y avisos
  alertInfo: `
    background: #e3f2fd;
    border-left: 4px solid #2196f3;
    padding: 15px 20px;
    border-radius: 6px;
    margin: 20px 0;
    color: #1976d2;
  `,

  alertWarning: `
    background: #fff3e0;
    border-left: 4px solid #ff9800;
    padding: 15px 20px;
    border-radius: 6px;
    margin: 20px 0;
    color: #f57c00;
  `,

  alertSuccess: `
    background: #e8f5e9;
    border-left: 4px solid #4caf50;
    padding: 15px 20px;
    border-radius: 6px;
    margin: 20px 0;
    color: #388e3c;
  `,

  // Footer
  footer: `
    background: #f8f9fa;
    padding: 30px 20px;
    text-align: center;
    color: #666666;
    font-size: 13px;
    border-top: 1px solid #e9ecef;
    margin-top: 20px;
  `,

  footerTitle: `
    color: #333333;
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 10px;
  `,

  footerText: `
    color: #666666;
    margin: 8px 0;
    font-size: 13px;
  `,

  footerLink: `
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
  `,

  // Separadores
  divider: `
    height: 1px;
    background: #e9ecef;
    margin: 30px 0;
    border: none;
  `,

  // Texto
  paragraph: `
    font-size: 15px;
    line-height: 1.7;
    color: #555555;
    margin: 15px 0;
  `,

  small: `
    font-size: 13px;
    color: #666666;
  `,

  // Mapa/ubicación
  mapContainer: `
    margin: 20px 0;
    text-align: center;
  `,

  mapImage: `
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    border: 2px solid #e9ecef;
  `,

  // Responsive
  mobileShow: `
    display: none !important;
    @media only screen and (max-width: 600px) {
      display: block !important;
    }
  `,

  mobileHide: `
    @media only screen and (max-width: 600px) {
      display: none !important;
    }
  `
};

/**
 * Genera CSS inline completo para email
 */
const getInlineStyles = () => {
  return `
    <style>
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; padding: 0 !important; }
        .content { padding: 20px 15px !important; }
        .header { padding: 30px 15px !important; }
        .button { padding: 14px 30px !important; font-size: 15px !important; }
        .detailsBox { padding: 15px !important; margin: 15px 0 !important; }
      }
      
      /* Hover effects para clientes que los soporten */
      a:hover { opacity: 0.85; }
      
      /* Prevenir selección de textos no deseados */
      .noselect { user-select: none; }
    </style>
  `;
};

module.exports = {
  styles,
  getInlineStyles
};

