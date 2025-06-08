// Test específico para el caso del usuario
const axios = require('axios');

async function testYourCase() {
  console.log('🎯 TEST ESPECÍFICO PARA TU CASO\n');
  
  try {
    // Replicar exactamente lo que estás haciendo
    const yourBooking = {
      clientName: 'test1',
      clientEmail: 'test@score.com',
      clientPhone: '+54 9 11 1234-5678',
      serviceId: 'cmbnphqvp0001qh0i2tn1anxw', // Manicura semipermanente (el que aparece en tu imagen)
      startTime: '2025-06-10T08:00:00.000Z', // Martes a las 8:00 AM
      notes: 'Prueba desde frontend',
      professionalId: null
    };
    
    console.log('📝 Datos de tu reserva:');
    console.log(JSON.stringify(yourBooking, null, 2));
    
    console.log('\n🔄 Intentando crear tu reserva...');
    
    try {
      const response = await axios.post(
        'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
        yourBooking
      );
      
      console.log('✅ ¡TU RESERVA FUNCIONÓ!');
      console.log('Respuesta:', JSON.stringify(response.data, null, 2));
      
      // Verificar que el cliente se creó
      console.log('\n🔍 Verificando cliente creado...');
      const clientCheck = await axios.get(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?email=test@score.com`);
      console.log('Cliente en sistema:', clientCheck.data);
      
    } catch (error) {
      console.log('❌ Tu reserva falló:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data?.message);
      
      if (error.response?.data?.message === 'No hay profesionales disponibles en el horario solicitado') {
        console.log('\n💡 SOLUCIÓN:');
        console.log('El profesional no trabaja a las 8:00 AM');
        console.log('Prueba con estos horarios que SÍ funcionan:');
        
        const workingHours = [
          '14:00', '15:00', '16:00', '17:00', '18:00'
        ];
        
        for (const hour of workingHours) {
          const testTime = '2025-06-10T' + hour + ':00:00.000Z';
          console.log(`\n⏰ Probando ${hour}...`);
          
          try {
            const testResponse = await axios.post(
              'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
              { ...yourBooking, startTime: testTime }
            );
            
            console.log(`   ✅ ¡${hour} FUNCIONA!`);
            console.log(`   Cliente: ${testResponse.data.data.clientName}`);
            console.log(`   Profesional: ${testResponse.data.data.professionalName}`);
            break;
            
          } catch (hourError) {
            console.log(`   ❌ ${hour}: ${hourError.response?.data?.message || 'Error'}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

testYourCase(); 