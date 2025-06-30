const axios = require('axios');

const RAILWAY_API = {
  backend: 'https://turnio-backend-production.up.railway.app'
};

async function investigarUsuarios() {
  try {
    console.log('🔍 === INVESTIGANDO USUARIOS REGISTRADOS ===\n');

    // Vamos a probar algunos emails comunes que podrías haber usado
    const emailsPosibles = [
      'prueba4@real.com',
      'prueba@real.com', 
      'test@example.com',
      'admin@test.com',
      'usuario@test.com'
    ];

    console.log('📧 Probando emails posibles...\n');

    for (const email of emailsPosibles) {
      try {
        // Intentar login solo para ver si el usuario existe
        const response = await axios.post(`${RAILWAY_API.backend}/api/auth/login`, {
          email: email,
          password: 'password_incorrecto_a_proposito'
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        if (error.response?.data?.message === 'Credenciales inválidas') {
          console.log(`✅ Usuario EXISTE: ${email} (contraseña incorrecta)`);
        } else if (error.response?.data?.message === 'Usuario no encontrado') {
          console.log(`❌ Usuario NO existe: ${email}`);
        } else {
          console.log(`⚠️ ${email}: ${error.response?.data?.message || 'Error desconocido'}`);
        }
      }
    }

    console.log('\n🤔 ¿Recuerdas exactamente el email que usaste?');
    console.log('💡 Opciones:');
    console.log('1. Probar con otro email');
    console.log('2. Registrar un nuevo usuario para la prueba');
    console.log('3. Ver si la contraseña es diferente');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Función para registrar usuario nuevo si es necesario
async function registrarUsuarioNuevo() {
  try {
    console.log('\n🆕 === REGISTRANDO USUARIO NUEVO PARA PRUEBA ===\n');

    const nuevoUsuario = {
      name: 'Usuario Prueba Cobros',
      email: 'prueba.cobros@test.com',
      phone: '1234567890',
      password: 'TestCobros123',
      businessName: 'Negocio Prueba Cobros',
      businessType: 'HEALTH'
    };

    console.log('📝 Registrando usuario:', nuevoUsuario.email);

    const response = await axios.post(`${RAILWAY_API.backend}/api/auth/register`, nuevoUsuario, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('✅ Usuario registrado exitosamente!');
    console.log('📧 Email:', nuevoUsuario.email);
    console.log('🔑 Contraseña:', nuevoUsuario.password);
    
    if (response.data.token) {
      console.log('\n🎉 TOKEN OBTENIDO:');
      console.log('📋 Token JWT:', response.data.token);
      console.log('\n🚀 PUEDES PROBAR COBROS AUTOMÁTICOS:');
      console.log(`node test-cobro-automatico-api.js ${response.data.token}`);
    }

  } catch (error) {
    console.error('❌ Error registrando:', error.response?.data || error.message);
  }
}

// Ejecutar según argumentos
const args = process.argv.slice(2);
if (args[0] === 'nuevo') {
  registrarUsuarioNuevo();
} else {
  investigarUsuarios();
} 