// Script para probar el problema sin teléfono vs con teléfono
const axios = require('axios');

async function testSinTelefono() {
  console.log('📞 PROBANDO: SIN TELÉFONO vs CON TELÉFONO\n');
  
  try {
    // 1. Probar SIN teléfono (donde aparecía "carlos")
    console.log('1️⃣ Probando SIN teléfono...');
    
    const sinTelefono = {
      clientName: 'alfredo',
      clientEmail: 'alfredo@test.com',
      clientPhone: '', // Vacío
      serviceId: 'cmbnphqvp0001qh0i2tn1anxw',
      startTime: '2025-06-15T14:00:00.000Z',
      notes: 'Test sin teléfono - debe mostrar alfredo',
      professionalId: null
    };
    
    console.log('📝 Datos SIN teléfono:');
    console.log(JSON.stringify(sinTelefono, null, 2));
    
    try {
      const responseSin = await axios.post(
        'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
        sinTelefono
      );
      
      console.log('✅ Respuesta SIN teléfono:');
      console.log(JSON.stringify(responseSin.data, null, 2));
      
      const nombreSin = responseSin.data.data?.clientName;
      console.log(`\n🎭 SIN TELÉFONO - Enviado: "alfredo", Recibido: "${nombreSin}"`);
      
      if (nombreSin === 'alfredo') {
        console.log('✅ ¡CORRECTO! Sin teléfono funciona');
      } else {
        console.log(`❌ PROBLEMA: Esperaba "alfredo" pero obtuve "${nombreSin}"`);
      }
      
    } catch (error) {
      console.log('❌ Error sin teléfono:', error.response?.data);
    }
    
    // 2. Probar CON teléfono (donde funcionaba bien)
    console.log('\n2️⃣ Probando CON teléfono...');
    
    const conTelefono = {
      clientName: 'alfredo',
      clientEmail: 'alfredo@test.com',
      clientPhone: '+54 9 11 1234-5678',
      serviceId: 'cmbnphqvp0001qh0i2tn1anxw',
      startTime: '2025-06-16T14:00:00.000Z',
      notes: 'Test con teléfono - debe mostrar alfredo',
      professionalId: null
    };
    
    console.log('📝 Datos CON teléfono:');
    console.log(JSON.stringify(conTelefono, null, 2));
    
    try {
      const responseCon = await axios.post(
        'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
        conTelefono
      );
      
      console.log('✅ Respuesta CON teléfono:');
      console.log(JSON.stringify(responseCon.data, null, 2));
      
      const nombreCon = responseCon.data.data?.clientName;
      console.log(`\n🎭 CON TELÉFONO - Enviado: "alfredo", Recibido: "${nombreCon}"`);
      
      if (nombreCon === 'alfredo') {
        console.log('✅ ¡CORRECTO! Con teléfono funciona');
      } else {
        console.log(`❌ PROBLEMA: Esperaba "alfredo" pero obtuve "${nombreCon}"`);
      }
      
    } catch (error) {
      console.log('❌ Error con teléfono:', error.response?.data);
    }
    
    // 3. Probar solo con email único (sin teléfono)
    console.log('\n3️⃣ Probando con email único sin teléfono...');
    
    const emailUnico = {
      clientName: 'CLIENTE-UNICO',
      clientEmail: `unico-${Date.now()}@test.com`,
      clientPhone: null, // Explícitamente null
      serviceId: 'cmbnphqvp0001qh0i2tn1anxw',
      startTime: '2025-06-17T14:00:00.000Z',
      notes: 'Test email único sin teléfono',
      professionalId: null
    };
    
    console.log('📝 Datos email único:');
    console.log(JSON.stringify(emailUnico, null, 2));
    
    try {
      const responseUnico = await axios.post(
        'https://turnio-backend-production.up.railway.app/api/public/cdfa/book',
        emailUnico
      );
      
      console.log('✅ Respuesta email único:');
      console.log(JSON.stringify(responseUnico.data, null, 2));
      
      const nombreUnico = responseUnico.data.data?.clientName;
      console.log(`\n🎭 EMAIL ÚNICO - Enviado: "CLIENTE-UNICO", Recibido: "${nombreUnico}"`);
      
    } catch (error) {
      console.log('❌ Error email único:', error.response?.data);
    }
    
    console.log('\n📋 RESUMEN DEL TEST:');
    console.log('   Este test confirma si el problema del "carlos" se solucionó');
    console.log('   al arreglar la lógica de búsqueda por teléfono vacío.');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

testSinTelefono(); 