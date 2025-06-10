const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

async function getRealData() {
  try {
    console.log('🔍 Getting real business data...');
    
    // Obtener servicios del negocio (usando la ruta correcta)
    const servicesResponse = await axios.get(`${API_BASE}/appointments/public/barberia-rodo/services`);
    console.log('✅ Services:', servicesResponse.data.data?.slice(0, 2));
    
    // Obtener profesionales del negocio (usando la ruta correcta)
    const professionalsResponse = await axios.get(`${API_BASE}/appointments/public/barberia-rodo/all-professionals`);
    console.log('✅ Professionals:', professionalsResponse.data.data?.professionals?.slice(0, 2));
    
    // Usar datos reales para hacer booking
    const services = servicesResponse.data.data || [];
    const professionals = professionalsResponse.data.data?.professionals || [];
    
    if (services.length === 0) {
      console.log('❌ No services found for barberia-rodo');
      return;
    }
    
    if (professionals.length === 0) {
      console.log('❌ No professionals found for barberia-rodo');
      return;
    }
    
    // Crear reserva con datos reales
    const realBookingData = {
      clientName: "Cliente Test Real",
      clientEmail: "clientetest@example.com",
      clientPhone: "1234567890", 
      serviceId: services[0].id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
      notes: "Reserva de prueba con datos reales",
      professionalId: professionals[0].id
    };
    
    console.log('📋 Booking data:', realBookingData);
    
    const bookingResponse = await axios.post(`${API_BASE}/public/barberia-rodo/book`, realBookingData);
    console.log('✅ Real booking successful:', bookingResponse.data);
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Full error:', error.response?.data);
  }
}

// Ejecutar test
getRealData(); 