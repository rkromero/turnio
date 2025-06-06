const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Utilidades para contraseñas
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Utilidades para JWT
const generateToken = (userId, businessId) => {
  console.log('🔍 [DEBUG] Generando token para userId:', userId, 'businessId:', businessId);
  
  if (!process.env.JWT_SECRET) {
    console.error('❌ [DEBUG] JWT_SECRET no está configurado!');
    throw new Error('JWT_SECRET no configurado');
  }
  
  console.log('🔍 [DEBUG] JWT_SECRET configurado, generando token...');
  
  const payload = {
    userId,
    businessId
  };
  
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  console.log('🔍 [DEBUG] Token generado exitosamente');
  
  return token;
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido');
  }
};

// Configurar cookie con token
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true, // No accesible desde JavaScript del cliente
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    sameSite: 'strict', // Protección CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
  };

  res.cookie('token', token, cookieOptions);
};

// Limpiar cookie de token
const clearTokenCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

// Generar slug único para negocio
const generateBusinessSlug = (businessName) => {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
    .trim('-'); // Remover guiones al inicio y final
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  setTokenCookie,
  clearTokenCookie,
  generateBusinessSlug,
}; 