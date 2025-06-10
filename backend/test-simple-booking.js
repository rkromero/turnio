const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

async function testSimpleBooking() {
  try {
    console.log('🔧 Getting business data...');
    
    // Obtener datos reales primero
    const dataResponse = await axios.get(`${API_BASE}/debug/business-data/barberia-rodo`);
    const data = dataResponse.data.data;
    
    console.log('✅ Business:', data.business.name);
    console.log('✅ Service:', data.services[0].name);
    console.log('✅ Professional:', data.users[0].name);
    
    // Datos para el booking simplificado
    const bookingData = {
      businessSlug: 'barberia-rodo',
      clientName: "Cliente Simple Test",
      clientEmail: "clientesimple@example.com",
      clientPhone: "1234567890",
      serviceId: data.services[0].id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: "Test booking simple",
      professionalId: data.users[0].id
    };
    
    console.log('\n🎯 Testing simple booking...');
    console.log('📋 Booking data:', bookingData);
    
    const bookingResponse = await axios.post(`${API_BASE}/debug/simple-booking`, bookingData);
    
    console.log('\n✅ SIMPLE BOOKING SUCCESSFUL!');
    console.log('Response:', bookingResponse.data);
    
    // Ahora probar el endpoint original para comparar
    console.log('\n🔄 Testing original booking endpoint...');
    try {
      const originalBookingData = {
        ...bookingData,
        clientEmail: "clienteoriginal@example.com" // Email diferente para evitar duplicados
      };
      
      const originalResponse = await axios.post(`${API_BASE}/public/barberia-rodo/book`, originalBookingData);
      console.log('✅ ORIGINAL BOOKING ALSO WORKS!');
      console.log('Response:', originalResponse.data);
    } catch (originalError) {
      console.log('❌ ORIGINAL BOOKING STILL FAILS:');
      console.log('Status:', originalError.response?.status);
      console.log('Message:', originalError.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Simple booking test failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Error:', error.message);
  }
}

// Ejecutar test
testSimpleBooking(); 