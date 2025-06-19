#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Configuración Rápida de TurnIO\n');

async function quickSetup() {
  try {
    console.log('📋 Por favor, proporciona las siguientes credenciales:\n');
    
    // Solicitar credenciales básicas con validación
    let databaseUrl = await question('📊 URL de la base de datos (DATABASE_URL): ');
    while (!databaseUrl || databaseUrl.trim() === '') {
      console.log('⚠️  La URL de la base de datos es obligatoria');
      databaseUrl = await question('📊 URL de la base de datos (DATABASE_URL): ');
    }
    
    let jwtSecret = await question('🔐 JWT Secret (o presiona Enter para generar uno automáticamente): ');
    if (!jwtSecret || jwtSecret.trim() === '') {
      jwtSecret = crypto.randomBytes(64).toString('hex');
      console.log('🔐 JWT Secret generado automáticamente');
    }
    
    let mpToken = await question('💳 Token de MercadoPago (MERCADOPAGO_ACCESS_TOKEN): ');
    while (!mpToken || mpToken.trim() === '') {
      console.log('⚠️  El token de MercadoPago es obligatorio');
      mpToken = await question('💳 Token de MercadoPago (MERCADOPAGO_ACCESS_TOKEN): ');
    }
    
    let frontendUrl = await question('🌐 URL del Frontend (o presiona Enter para usar localhost:3000): ');
    if (!frontendUrl || frontendUrl.trim() === '') {
      frontendUrl = 'http://localhost:3000';
    }
    
    let backendUrl = await question('🔧 URL del Backend (o presiona Enter para usar localhost:5000): ');
    if (!backendUrl || backendUrl.trim() === '') {
      backendUrl = 'http://localhost:5000';
    }
    
    // Crear contenido del .env
    const envContent = `# Configuración de Base de Datos
DATABASE_URL="${databaseUrl.trim()}"

# Configuración de JWT
JWT_SECRET="${jwtSecret.trim()}"

# Configuración de MercadoPago
MERCADOPAGO_ACCESS_TOKEN="${mpToken.trim()}"
MERCADOPAGO_PUBLIC_KEY="TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# URLs del Frontend y Backend
FRONTEND_URL="${frontendUrl.trim()}"
BACKEND_URL="${backendUrl.trim()}"

# Configuración de CORS
CORS_ORIGIN="${frontendUrl.trim()}"

# Configuración de Email (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="tu_email@gmail.com"
SMTP_PASS="tu_password_de_aplicacion"

# Configuración adicional
NODE_ENV="development"
PORT=5000
`;

    // Verificar si ya existe .env
    if (fs.existsSync('.env')) {
      const overwrite = await question('⚠️  El archivo .env ya existe. ¿Quieres sobrescribirlo? (s/n): ');
      if (overwrite.toLowerCase() !== 's' && overwrite.toLowerCase() !== 'si' && overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('❌ Operación cancelada');
        rl.close();
        return;
      }
    }

    // Escribir archivo .env
    fs.writeFileSync('.env', envContent);
    
    console.log('\n✅ ¡Configuración completada exitosamente!');
    console.log('📁 Archivo .env creado/actualizado');
    console.log('🔒 El archivo está protegido por .gitignore');
    console.log('\n📋 Resumen de configuración:');
    console.log(`   📊 Base de datos: ${databaseUrl.substring(0, 50)}...`);
    console.log(`   🔐 JWT Secret: ${jwtSecret.substring(0, 20)}...`);
    console.log(`   💳 MercadoPago: ${mpToken.substring(0, 20)}...`);
    console.log(`   🌐 Frontend: ${frontendUrl}`);
    console.log(`   🔧 Backend: ${backendUrl}`);
    
    console.log('\n🚀 Ahora puedes ejecutar las pruebas:');
    console.log('   npm run test');
    console.log('   o');
    console.log('   node test-subscription-flow.js');
    console.log('   o');
    console.log('   npm start');
    
    rl.close();
  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
    console.error('💡 Asegúrate de tener permisos de escritura en el directorio');
    rl.close();
  }
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Manejar interrupción del proceso
process.on('SIGINT', () => {
  console.log('\n❌ Configuración cancelada por el usuario');
  rl.close();
  process.exit(0);
});

// Ejecutar configuración
quickSetup(); 