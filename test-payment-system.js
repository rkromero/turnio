const axios = require('axios');

// Configuración
const API_BASE = 'https://turnio-backend-production.up.railway.app';
const FRONTEND_BASE = 'https://turnio-frontend-production.up.railway.app';

// Token de prueba (reemplazar por uno real)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzUwZDc3Ni0zMjQ3LTQ3YTYtYjQzNS01YzI5NzJmZmQyNzgiLCJidXNpbmVzc0lkIjoiNjc1MGQ3NzYtNDU5Mi00ZDRlLWJjZDMtNWI4MzRiNjI4YTJjIiwiaWF0IjoxNzM0MDI0MDc4LCJleHAiOjE3MzQ2Mjg4Nzh9.F7qO8j8D0n4_6ZdRVcYXWxJfEJ6OjYmkUGNJ8xJZz5Q';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testPaymentSystem() {
  console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA DE PAGOS\n');

  try {
    // 1. Verificar estado de conexión de MercadoPago
    console.log('1️⃣ Verificando estado de conexión con MercadoPago...');
    try {
      const mpStatus = await api.get('/api/payments/mp/status');
      console.log('✅ Estado de MP:', {
        connected: mpStatus.data.data.connected,
        user_id: mpStatus.data.data.mp_user_id,
        connected_at: mpStatus.data.data.connected_at
      });
    } catch (error) {
      console.log('❌ Error verificando MP status:', error.response?.data || error.message);
    }

    // 2. Obtener configuración de pagos
    console.log('\n2️⃣ Obteniendo configuración de pagos...');
    try {
      const settings = await api.get('/api/payments/settings');
      console.log('✅ Configuración actual:', settings.data.data);
    } catch (error) {
      console.log('❌ Error obteniendo configuración:', error.response?.data || error.message);
    }

    // 3. Probar URL de conexión de MP
    console.log('\n3️⃣ Generando URL de conexión de MercadoPago...');
    try {
      const connectUrl = await api.get('/api/payments/mp/connect');
      console.log('✅ URL de conexión generada:', connectUrl.data.data.auth_url);
      console.log('📝 Para conectar MP, visita:', connectUrl.data.data.auth_url);
    } catch (error) {
      console.log('❌ Error generando URL:', error.response?.data || error.message);
    }

    // 4. Obtener lista de citas para probar pagos
    console.log('\n4️⃣ Obteniendo citas disponibles...');
    try {
      const appointments = await api.get('/api/appointments');
      const appointmentsList = appointments.data.data.appointments || appointments.data.appointments;
      
      if (appointmentsList && appointmentsList.length > 0) {
        console.log(`✅ Encontradas ${appointmentsList.length} citas`);
        
        const testAppointment = appointmentsList[0];
        console.log('📋 Cita de prueba:', {
          id: testAppointment.id,
          service: testAppointment.service?.name,
          client: testAppointment.client?.name,
          price: testAppointment.service?.price,
          payment_status: testAppointment.payment_status
        });

        // 5. Intentar crear preferencia de pago
        console.log('\n5️⃣ Creando preferencia de pago...');
        try {
          const preference = await api.post('/api/payments/preference', {
            appointmentId: testAppointment.id
          });
          
          console.log('✅ Preferencia creada exitosamente:');
          console.log('💳 Preference ID:', preference.data.data.preference_id);
          console.log('🔗 Link de pago:', preference.data.data.init_point);
          console.log('💰 Monto:', preference.data.data.amount);
          console.log('🏪 Negocio:', preference.data.data.business_name);

        } catch (error) {
          console.log('❌ Error creando preferencia:', error.response?.data || error.message);
          
          if (error.response?.data?.error_code === 'MP_NOT_CONNECTED') {
            console.log('💡 Necesitas conectar MercadoPago primero');
          }
        }

        // 6. Verificar estado del pago
        console.log('\n6️⃣ Verificando estado del pago...');
        try {
          const paymentStatus = await api.get(`/api/payments/status/${testAppointment.id}`);
          console.log('✅ Estado del pago:', paymentStatus.data.data);
        } catch (error) {
          console.log('❌ Error verificando estado:', error.response?.data || error.message);
        }

      } else {
        console.log('⚠️ No se encontraron citas para probar');
      }
    } catch (error) {
      console.log('❌ Error obteniendo citas:', error.response?.data || error.message);
    }

    // 7. Obtener historial de pagos
    console.log('\n7️⃣ Obteniendo historial de pagos...');
    try {
      const history = await api.get('/api/payments/history');
      console.log('✅ Historial de pagos:', {
        total: history.data.data.pagination.total,
        payments: history.data.data.payments.length
      });
      
      if (history.data.data.payments.length > 0) {
        const lastPayment = history.data.data.payments[0];
        console.log('💳 Último pago:', {
          id: lastPayment.id,
          amount: lastPayment.amount,
          status: lastPayment.status,
          created_at: lastPayment.created_at
        });
      }
    } catch (error) {
      console.log('❌ Error obteniendo historial:', error.response?.data || error.message);
    }

    // 8. Probar actualización de configuración
    console.log('\n8️⃣ Probando actualización de configuración...');
    try {
      const newSettings = {
        require_payment: false,
        payment_deadline_hours: 48,
        auto_cancel_unpaid: false
      };
      
      const updateResult = await api.put('/api/payments/settings', newSettings);
      console.log('✅ Configuración actualizada:', updateResult.data.message);
    } catch (error) {
      console.log('❌ Error actualizando configuración:', error.response?.data || error.message);
    }

    // 9. Probar webhook (simulación)
    console.log('\n9️⃣ Información sobre webhooks...');
    console.log('📡 URL del webhook:', `${API_BASE}/api/payments/webhook`);
    console.log('💡 Configura esta URL en tu aplicación de MercadoPago');

    console.log('\n🎉 PRUEBAS COMPLETADAS');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Conecta tu cuenta de MercadoPago usando la URL generada');
    console.log('2. Configura el webhook en tu aplicación de MercadoPago');
    console.log('3. Prueba hacer un pago real desde el frontend');
    console.log('4. Verifica que los webhooks se procesen correctamente');

  } catch (error) {
    console.error('❌ Error general en las pruebas:', error.message);
  }
}

async function testMercadoPagoConfig() {
  console.log('\n🔧 VERIFICANDO CONFIGURACIÓN DE MERCADOPAGO\n');

  // Verificar variables de entorno necesarias
  console.log('📋 Variables de entorno necesarias:');
  console.log('- MP_CLIENT_ID: Para OAuth de MercadoPago');
  console.log('- MP_CLIENT_SECRET: Para OAuth de MercadoPago');
  console.log('- MP_REDIRECT_URI: URL de callback (opcional)');
  console.log('- FRONTEND_URL: URL del frontend');
  console.log('- BACKEND_URL: URL del backend');

  console.log('\n💡 Para configurar MercadoPago:');
  console.log('1. Ve a https://developers.mercadopago.com/');
  console.log('2. Crea una aplicación');
  console.log('3. Obtén tu CLIENT_ID y CLIENT_SECRET');
  console.log('4. Configura la URL de redirección');
  console.log('5. Agrega las variables al archivo .env');
}

// Ejecutar pruebas
if (require.main === module) {
  testPaymentSystem()
    .then(() => testMercadoPagoConfig())
    .catch(console.error);
}

module.exports = { testPaymentSystem, testMercadoPagoConfig }; 