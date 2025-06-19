const crypto = require('crypto');

// Generar JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('🔐 JWT_SECRET generado:');
console.log(`JWT_SECRET="${jwtSecret}"`);
console.log('\n📋 Copia esta línea y pégala en tu archivo .env');
console.log('💡 O ejecuta: node quick-setup.js para reconfigurar todo'); 