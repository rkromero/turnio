// Script para obtener un token JWT nuevo
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 Generador de Token JWT - Turnio');
console.log('Este script te ayudará a obtener un token nuevo\n');

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function login(email, password) {
  const postData = JSON.stringify({
    email: email,
    password: password
  });

  const options = {
    hostname: 'turnio-backend-production.up.railway.app',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    const email = await askQuestion('📧 Ingresa tu email: ');
    const password = await askQuestion('🔑 Ingresa tu contraseña: ');
    
    console.log('\n🔄 Iniciando sesión...');
    
    const response = await login(email, password);
    
    if (response.success) {
      // Buscar el token en diferentes lugares posibles
      const token = response.token || 
                   response.data?.token || 
                   response.accessToken || 
                   response.data?.accessToken;
      
      if (token) {
        console.log('\n✅ ¡Token obtenido exitosamente!');
        console.log('\n🔑 Tu token JWT es:');
        console.log('────────────────────────────────────────');
        console.log(token);
        console.log('────────────────────────────────────────');
        console.log('\n📝 Copia este token y úsalo en migrate-simple.js');
        console.log('\n💡 Tip: Este token expira después de un tiempo,');
        console.log('    así que úsalo pronto para la migración.');
      } else {
        console.log('\n⚠️ Login exitoso pero no se encontró token en la respuesta');
        console.log('Respuesta completa:', JSON.stringify(response, null, 2));
      }
    } else {
      console.log('\n❌ Error de login:', response.message || 'Credenciales incorrectas');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

main(); 