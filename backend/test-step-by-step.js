const axios = require('axios');

const API_BASE = 'https://turnio-backend-production.up.railway.app/api';

async function testStepByStep() {
  try {
    console.log('🔧 Getting business data first...');
    
    // Obtener datos reales primero
    const dataResponse = await axios.get(`${API_BASE}/debug/business-data/barberia-rodo`);
    const data = dataResponse.data.data;
    
    console.log('✅ Business:', data.business.name);
    console.log('✅ Service:', data.services[0].name);
    console.log('✅ Professional:', data.users[0].name);
    
    // Datos para el booking paso a paso
    const bookingData = {
      businessSlug: 'barberia-rodo',
      clientName: "Test Cliente Paso a Paso",
      clientEmail: "testpasoapaso@example.com",
      clientPhone: "1234567890",
      serviceId: data.services[0].id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: "Test paso a paso",
      professionalId: data.users[0].id
    };
    
    console.log('\n🎯 Testing step-by-step booking...');
    console.log('📋 Booking data:', bookingData);
    
    const stepResponse = await axios.post(`${API_BASE}/debug/booking-step-by-step`, bookingData);
    
    console.log('\n📊 STEP BY STEP RESULTS:');
    console.log('Success:', stepResponse.data.success);
    
    if (stepResponse.data.steps) {
      stepResponse.data.steps.forEach((step, index) => {
        console.log(`${index + 1}. ${step}`);
      });
    }
    
    if (stepResponse.data.success) {
      console.log('\n✅ BOOKING SUCCESSFUL!');
      console.log('Appointment:', stepResponse.data.appointment);
    } else {
      console.log('\n❌ BOOKING FAILED!');
      console.log('Error:', stepResponse.data.error);
      if (stepResponse.data.stack) {
        console.log('Stack trace:', stepResponse.data.stack);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Error:', error.message);
  }
}

// Ejecutar test
testStepByStep(); 