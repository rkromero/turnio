const axios = require('axios');

const RAILWAY_API = {
  backend: 'https://turnio-backend-production.up.railway.app'
};

async function crearUsuarioTestCobros() {
  try {
    console.log('🚀 === CREANDO USUARIO PARA PRUEBA DE COBROS AUTOMÁTICOS ===\n');

    // Tipos de negocio válidos según tu esquema
    const tiposValidos = ['BEAUTY', 'HEALTH', 'FITNESS', 'EDUCATION', 'CONSULTING', 'OTHER'];
    
    const nuevoUsuario = {
      name: 'Usuario Test Cobros',
      email: `test.cobros.${Date.now()}@example.com`,
      phone: '1234567890',
      password: 'TestCobros123', // Contraseña simple sin caracteres especiales
      businessName: 'Negocio Test Cobros Automáticos',
      businessType: 'GENERAL' // Tipo válido
    };

    console.log('📝 Datos del nuevo usuario:');
    console.log('📧 Email:', nuevoUsuario.email);
    console.log('🔑 Contraseña:', nuevoUsuario.password);
    console.log('🏢 Negocio:', nuevoUsuario.businessName);
    console.log('🏢 Tipo:', nuevoUsuario.businessType);

    console.log('\n1️⃣ Registrando usuario...');
    
    const registerResponse = await axios.post(`${RAILWAY_API.backend}/api/auth/register`, nuevoUsuario, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true
    });

    console.log('📊 Status:', registerResponse.status);
    
    if (registerResponse.status === 201 || registerResponse.status === 200) {
      console.log('✅ ¡Usuario registrado exitosamente!');
      
      const { token, user } = registerResponse.data;
      
      if (token) {
        console.log('\n🎉 TOKEN OBTENIDO EXITOSAMENTE:');
        console.log('📋 Token JWT:', token);
        
        console.log('\n👤 Información del usuario:');
        console.log('📧 Email:', user.email);
        console.log('🏢 Negocio:', user.business?.name);
        console.log('💳 Plan inicial:', user.business?.planType || 'FREE');
        
        console.log('\n🎯 AHORA NECESITAS CREAR UNA SUSCRIPCIÓN DE PAGO');
        console.log('Para probar cobros automáticos, ve a:');
        console.log('1. https://turnio-frontend-production.up.railway.app');
        console.log('2. Inicia sesión con:');
        console.log(`   📧 Email: ${nuevoUsuario.email}`);
        console.log(`   🔑 Contraseña: ${nuevoUsuario.password}`);
        console.log('3. Ve a Configuración → Planes');
        console.log('4. Selecciona un plan de pago (BASIC/PREMIUM)');
        console.log('5. Completa el pago con la tarjeta de prueba');
        
        console.log('\n💳 TARJETA DE PRUEBA PARA MERCADOPAGO:');
        console.log('Número: 4509 9535 6623 3704');
        console.log('CVV: 123');
        console.log('Fecha: 11/25');
        console.log('Titular: APRO');
        
        console.log('\n🚀 DESPUÉS DEL PAGO, EJECUTA:');
        console.log(`node test-cobro-automatico-api.js ${token}`);
        
        return token;
      } else {
        console.log('❌ No se recibió token en la respuesta');
        console.log('📄 Respuesta:', registerResponse.data);
      }
    } else {
      console.log('❌ Error en registro:', registerResponse.data);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

crearUsuarioTestCobros(); 