// Script para debuggear problema de horarios
const axios = require('axios');

async function debugHorarioProblem() {
  console.log('🕐 DEBUGGEANDO PROBLEMA DE HORARIOS\n');
  
  try {
    // 1. Probar con diferentes formatos de hora
    console.log('1️⃣ Probando diferentes formatos de hora para viernes 13 a las 12:00...');
    
    // Obtener la fecha del próximo viernes 13
    const today = new Date();
    let viernes13 = new Date();
    
    // Buscar el próximo viernes 13
    // Comenzar desde hoy y buscar hacia adelante
    for (let i = 0; i < 365; i++) {
      const testDate = new Date(today);
      testDate.setDate(today.getDate() + i);
      
      if (testDate.getDay() === 5 && testDate.getDate() === 13) { // Viernes (5) y día 13
        viernes13 = testDate;
        break;
      }
    }
    
    console.log(`📅 Próximo viernes 13 encontrado: ${viernes13.toLocaleDateString('es-ES')}`);
    
    // Crear diferentes formatos de tiempo para las 12:00
    const formatos = [
      {
        nombre: 'ISO 12:00 UTC',
        tiempo: new Date(viernes13.getFullYear(), viernes13.getMonth(), viernes13.getDate(), 12, 0, 0).toISOString()
      },
      {
        nombre: 'ISO 12:00 Local como UTC',
        tiempo: `${viernes13.getFullYear()}-${String(viernes13.getMonth() + 1).padStart(2, '0')}-${String(viernes13.getDate()).padStart(2, '0')}T12:00:00.000Z`
      },
      {
        nombre: 'ISO 15:00 UTC (12:00 Argentina)',
        tiempo: `${viernes13.getFullYear()}-${String(viernes13.getMonth() + 1).padStart(2, '0')}-${String(viernes13.getDate()).padStart(2, '0')}T15:00:00.000Z`
      }
    ];
    
    for (const formato of formatos) {
      console.log(`\n🕐 Probando: ${formato.nombre}`);
      console.log(`   Hora enviada: ${formato.tiempo}`);
      
      // Convertir a hora local para mostrar
      const fechaLocal = new Date(formato.tiempo);
      console.log(`   Esto es: ${fechaLocal.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} (Argentina)`);
      console.log(`   O: ${fechaLocal.toLocaleString('en-US', { timeZone: 'UTC' })} (UTC)`);
      
      const testBooking = {
        clientName: 'pepe',
        clientEmail: `pepe-test-${Date.now()}@test.com`,
        clientPhone: '+54 9 11 9876-5432',
        serviceId: 'cmbnphqvp0001qh0i2tn1anxw',
        startTime: formato.tiempo,
        notes: `Test horario: ${formato.nombre}`,
        professionalId: null
      };
      
      try {
        const response = await axios.post(
          'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
          testBooking
        );
        
        console.log('✅ Reserva creada exitosamente');
        
        // Analizar la hora devuelta
        const startTimeDevuelto = response.data.data?.startTime;
        if (startTimeDevuelto) {
          const fechaDevuelta = new Date(startTimeDevuelto);
          console.log(`📋 Hora guardada: ${startTimeDevuelto}`);
          console.log(`   En Argentina: ${fechaDevuelta.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`);
          console.log(`   En UTC: ${fechaDevuelta.toLocaleString('en-US', { timeZone: 'UTC' })}`);
          
          // Extraer solo la hora
          const horaArgentina = fechaDevuelta.toLocaleTimeString('es-AR', { 
            timeZone: 'America/Argentina/Buenos_Aires',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          console.log(`🎯 RESULTADO: Hora en Argentina = ${horaArgentina}`);
          
          if (horaArgentina.includes('12:')) {
            console.log('✅ ¡CORRECTO! Se guardó a las 12');
          } else if (horaArgentina.includes('09:')) {
            console.log('❌ PROBLEMA: Se guardó a las 9 (diferencia de -3 horas)');
          } else {
            console.log(`⚠️ Se guardó a las ${horaArgentina} (diferencia inesperada)`);
          }
        }
        
      } catch (error) {
        console.log('❌ Error:', error.response?.data?.message || error.message);
      }
      
      console.log('─'.repeat(50));
    }
    
    // 2. Verificar zona horaria del servidor
    console.log('\n2️⃣ Verificando información de zona horaria...');
    
    const ahora = new Date();
    console.log(`Hora actual del script: ${ahora.toISOString()}`);
    console.log(`Hora local Argentina: ${ahora.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`);
    console.log(`Hora UTC: ${ahora.toLocaleString('en-US', { timeZone: 'UTC' })}`);
    
    const offsetArgentina = -3; // UTC-3
    console.log(`Offset Argentina: UTC${offsetArgentina}`);
    
    console.log('\n📋 ANÁLISIS:');
    console.log('• Si solicitas 12:00 y se guarda 09:00, hay diferencia de -3 horas');
    console.log('• Esto sugiere que el frontend envía hora local pero el backend la trata como UTC');
    console.log('• Solución: El frontend debe enviar UTC+3 para compensar');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

debugHorarioProblem(); 