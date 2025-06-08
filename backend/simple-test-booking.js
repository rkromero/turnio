// Test simple de disponibilidad de profesionales
const axios = require('axios');

async function simpleTest() {
  console.log('🧪 TEST SIMPLE DE DISPONIBILIDAD\n');
  
  try {
    // Intentar diferentes fechas y horarios para ver si alguna funciona
    const testCases = [
      {
        name: 'Mañana 10:00',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/T.*/, 'T10:00:00.000Z')
      },
      {
        name: 'Mañana 14:00', 
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/T.*/, 'T14:00:00.000Z')
      },
      {
        name: 'Mañana 16:00',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/T.*/, 'T16:00:00.000Z')
      },
      {
        name: 'Lunes próximo 10:00',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace(/T.*/, 'T10:00:00.000Z')
      }
    ];
    
    const bookingData = {
      clientName: 'Test Simple',
      clientEmail: 'test-simple@ejemplo.com',
      clientPhone: '+5491122334455',
      serviceId: 'cmbkvwquf0001ob0fqpkgte6k', // Corte de pelo
      notes: 'Test de disponibilidad',
      professionalId: null
    };
    
    console.log('🔍 Probando diferentes horarios...\n');
    
    for (const testCase of testCases) {
      console.log(`⏰ Probando: ${testCase.name} (${testCase.startTime})`);
      
      try {
        const response = await axios.post(
          'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
          { ...bookingData, startTime: testCase.startTime }
        );
        
        console.log('   ✅ ÉXITO! Reserva creada');
        console.log('   Cliente:', response.data.data.clientName);
        console.log('   Profesional:', response.data.data.professionalName);
        return; // Salir al primer éxito
        
      } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
      }
    }
    
    console.log('\n📋 RESUMEN:');
    console.log('❌ Ningún horario funcionó - confirma que el problema es falta de profesionales');
    
    console.log('\n🔧 PRÓXIMOS PASOS:');
    console.log('1. Accede al panel de administración de TurnIO');
    console.log('2. Ve a la sección "Equipo" o "Profesionales"');
    console.log('3. Agrega al menos un profesional activo');
    console.log('4. Configura sus horarios de trabajo');
    console.log('5. Vuelve a probar las reservas');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

simpleTest(); 