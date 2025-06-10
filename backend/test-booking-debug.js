const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

async function testBookingDebug() {
  console.log('🔧 Testing booking debug endpoint...');
  
  const testData = {
    clientName: "Test Cliente",
    clientEmail: "test@example.com", 
    clientPhone: "1234567890",
    serviceId: "test-service-id",
    startTime: new Date().toISOString(),
    notes: "Test booking",
    professionalId: "test-professional-id"
  };
  
  try {
    // Test del endpoint de debug
    console.log('Testing debug endpoint...');
    const debugResponse = await axios.post(`${API_BASE}/debug/book-test`, testData);
    console.log('✅ Debug endpoint working:', debugResponse.data);
    
    // Test del endpoint real de booking
    console.log('Testing real booking endpoint...');
    const bookingResponse = await axios.post(`${API_BASE}/public/barberia-rodo/book`, testData);
    console.log('✅ Booking endpoint working:', bookingResponse.data);
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Full error:', error.response?.data);
    
    if (error.response?.status === 500) {
      console.error('This is a server error - check server logs');
    }
  }
}

// Ejecutar test
testBookingDebug(); 