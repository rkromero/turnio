const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

async function testBusinessData() {
  try {
    console.log('🔍 Getting barberia-rodo business data...');
    
    const response = await axios.get(`${API_BASE}/debug/business-data/barberia-rodo`);
    const data = response.data.data;
    
    console.log('✅ Business:', data.business);
    console.log('📋 Services:', data.services.length);
    data.services.forEach(service => {
      console.log(`  - ${service.name} (${service.duration}min, $${service.price}) - Active: ${service.isActive}`);
    });
    
    console.log('👥 Users:', data.users.length);
    data.users.forEach(user => {
      console.log(`  - ${user.name} (${user.role}) - Active: ${user.isActive}`);
    });
    
    // Si hay servicios y usuarios, intentar hacer una reserva
    if (data.services.length > 0 && data.users.length > 0) {
      console.log('\n🎯 Attempting real booking...');
      
      const bookingData = {
        clientName: "Cliente Test Final",
        clientEmail: "testfinal@example.com",
        clientPhone: "1234567890",
        serviceId: data.services[0].id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
        notes: "Reserva de prueba final",
        professionalId: data.users[0].id
      };
      
      console.log('📋 Booking data:', bookingData);
      
      const bookingResponse = await axios.post(`${API_BASE}/public/barberia-rodo/book`, bookingData);
      console.log('✅ Booking successful!', bookingResponse.data);
    } else {
      console.log('❌ Cannot make booking - missing services or users');
    }
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Full error:', error.response?.data);
  }
}

// Ejecutar test
testBusinessData(); 