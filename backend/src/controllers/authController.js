const { prisma } = require('../config/database');
const { hashPassword, comparePassword, generateToken, setTokenCookie, clearTokenCookie, generateBusinessSlug } = require('../utils/auth');
const { validationResult } = require('express-validator');

// Registro de nuevo negocio
const registerBusiness = async (req, res) => {
  try {
    console.log('🔍 Datos recibidos en registro:', req.body);
    
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Errores de validación:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { businessName, email, password, phone, address, description, businessType, defaultAppointmentDuration } = req.body;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Generar slug único para el negocio
    let slug = generateBusinessSlug(businessName);
    let slugExists = await prisma.business.findUnique({ where: { slug } });
    let counter = 1;

    while (slugExists) {
      slug = `${generateBusinessSlug(businessName)}-${counter}`;
      slugExists = await prisma.business.findUnique({ where: { slug } });
      counter++;
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(password);

    // Crear negocio y usuario admin en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear el negocio
      const business = await tx.business.create({
        data: {
          name: businessName,
          email,
          slug,
          phone,
          address,
          description,
          planType: 'FREE',
          maxAppointments: 30,
          businessType: businessType || 'GENERAL',
          defaultAppointmentDuration: defaultAppointmentDuration || 60
        }
      });

      // Crear sucursal principal automáticamente
      const mainBranch = await tx.branch.create({
        data: {
          businessId: business.id,
          name: `${businessName} - Principal`,
          slug: 'principal',
          address: address || null,
          phone: phone || null,
          description: 'Sucursal principal (creada automáticamente)',
          isMain: true,
          isActive: true
        }
      });

      // Crear el usuario administrador y asignarlo a la sucursal principal
      const user = await tx.user.create({
        data: {
          businessId: business.id,
          branchId: mainBranch.id,
          name: businessName,
          email,
          password: hashedPassword,
          role: 'ADMIN'
        }
      });

      return { business, user, mainBranch };
    });

    // Generar token JWT
    const token = generateToken(result.user.id, result.business.id);
    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Negocio registrado exitosamente',
      data: {
        business: {
          id: result.business.id,
          name: result.business.name,
          slug: result.business.slug,
          planType: result.business.planType
        },
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role
        },
        token: token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Login de usuario
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Buscar usuario con su negocio
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            maxAppointments: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar token JWT
    const token = generateToken(user.id, user.businessId);
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        business: user.business,
        token: token // Agregar token a la respuesta
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Logout
const logout = (req, res) => {
  clearTokenCookie(res);
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
};

// Obtener perfil del usuario actual
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            planType: true,
            maxAppointments: true,
            logo: true,
            primaryColor: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar
        },
        business: user.business
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  registerBusiness,
  login,
  logout,
  getProfile,
}; 