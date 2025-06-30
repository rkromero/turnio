const axios = require('axios');
const fs = require('fs');

async function verificarSuscripcion() {
  try {
    // Leer token del archivo
    const token = fs.readFileSync('temp-token.txt', 'utf8').trim();
    
    console.log('🔍 === VERIFICANDO ESTADO DE SUSCRIPCIÓN ===\n');
    
    // Verificar estado de suscripción
    const response = await axios.get('https://turnio-backend-production.up.railway.app/api/subscriptions/status', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Estado de suscripción:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

verificarSuscripcion(); 