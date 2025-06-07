// Test del generador de contraseñas
function generateTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  // Asegurar al menos una mayúscula, una minúscula y un número
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  
  // Completar con caracteres aleatorios
  for (let i = 0; i < 5; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Mezclar caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Probar el generador
for (let i = 0; i < 10; i++) {
  const password = generateTempPassword();
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
  
  console.log(`Password ${i + 1}: ${password}`);
  console.log(`- Longitud: ${password.length}`);
  console.log(`- Tiene minúscula: ${/[a-z]/.test(password)}`);
  console.log(`- Tiene mayúscula: ${/[A-Z]/.test(password)}`);
  console.log(`- Tiene número: ${/\d/.test(password)}`);
  console.log(`- Pasa regex: ${regex.test(password)}`);
  console.log('---');
} 