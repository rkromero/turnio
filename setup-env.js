const fs = require('fs');
const path = require('path');

console.log('🔧 Configurando variables de entorno...\n');

// Verificar si ya existe .env
if (fs.existsSync('.env')) {
  console.log('⚠️  El archivo .env ya existe. ¿Quieres sobrescribirlo? (s/n)');
  process.stdin.once('data', (data) => {
    const answer = data.toString().trim().toLowerCase();
    if (answer === 's' || answer === 'si' || answer === 'y' || answer === 'yes') {
      createEnvFile();
    } else {
      console.log('❌ Operación cancelada');
      process.exit(0);
    }
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  const envContent = `# Configuración de Base de Datos
DATABASE_URL="${process.env.DATABASE_URL || 'postgresql://usuario:contraseña@host:puerto/nombre_base_datos'}"

# Configuración de JWT
JWT_SECRET="${process.env.JWT_SECRET || 'tu_jwt_secret_super_seguro'}"

# Configuración de MercadoPago
MERCADOPAGO_ACCESS_TOKEN="${process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}"
MERCADOPAGO_PUBLIC_KEY="${process.env.MERCADOPAGO_PUBLIC_KEY || 'TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}"

# URLs del Frontend y Backend
FRONTEND_URL="${process.env.FRONTEND_URL || 'https://tu-frontend-url.com'}"
BACKEND_URL="${process.env.BACKEND_URL || 'https://tu-backend-url.com'}"

# Configuración de CORS
CORS_ORIGIN="${process.env.CORS_ORIGIN || 'https://tu-frontend-url.com'}"

# Configuración de Email (opcional)
SMTP_HOST="${process.env.SMTP_HOST || 'smtp.gmail.com'}"
SMTP_PORT=${process.env.SMTP_PORT || 587}
SMTP_USER="${process.env.SMTP_USER || 'tu_email@gmail.com'}"
SMTP_PASS="${process.env.SMTP_PASS || 'tu_password_de_aplicacion'}"
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Archivo .env creado exitosamente!');
  console.log('📝 Por favor, edita el archivo .env con tus credenciales reales');
  console.log('🔒 Recuerda que .env está en .gitignore por seguridad');
}

// Función para ejecutar pruebas
function runTests() {
  console.log('\n🧪 Ejecutando pruebas...');
  
  // Aquí puedes agregar comandos de prueba
  const { exec } = require('child_process');
  
  exec('node test-subscription-flow.js', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error ejecutando pruebas:', error);
      return;
    }
    console.log('✅ Pruebas completadas');
    console.log(stdout);
  });
}

// Exportar funciones para uso externo
module.exports = {
  createEnvFile,
  runTests
}; 