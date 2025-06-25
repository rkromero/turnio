const { prisma } = require('../config/database');
const { hashPassword, comparePassword, generateToken, setTokenCookie, clearTokenCookie, generateBusinessSlug } = require('../utils/auth');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

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

    // Crear negocio, usuario admin y suscripción FREE en una transacción
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

      // ✅ CREAR SUSCRIPCIÓN FREE AUTOMÁTICAMENTE
      const subscription = await tx.subscription.create({
        data: {
          businessId: business.id,
          planType: 'FREE',
          status: 'ACTIVE',
          startDate: new Date(),
          // Para plan FREE no hay fecha de vencimiento (null)
          nextBillingDate: null,
          priceAmount: 0,
          billingCycle: 'MONTHLY',
          autoRenew: false // Plan FREE no se auto-renueva
        }
      });

      return { business, user, mainBranch, subscription };
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
        subscription: {
          id: result.subscription.id,
          planType: result.subscription.planType,
          status: result.subscription.status
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

// Crear usuario de prueba (solo para desarrollo)
const createTestUser = async (req, res) => {
  try {
    const { businessName, email, password, phone, address, businessType, planType } = req.body;

    // Verificar si ya existe
    const existingBusiness = await prisma.business.findUnique({
      where: { email }
    });

    if (existingBusiness) {
      // Eliminar datos existentes
      await prisma.user.deleteMany({
        where: { business_id: existingBusiness.id }
      });
      
      await prisma.subscription.deleteMany({
        where: { business_id: existingBusiness.id }
      });

      await prisma.service.deleteMany({
        where: { business_id: existingBusiness.id }
      });

      await prisma.business.delete({
        where: { id: existingBusiness.id }
      });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear negocio
    const business = await prisma.business.create({
      data: {
        business_name: businessName,
        email,
        phone,
        address,
        business_type: businessType,
        subscription_status: 'ACTIVE',
        plan_type: planType,
        subscription_start: new Date(),
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
        subscription_auto_renew: true,
        mp_connected: false
      }
    });

    // Crear usuario administrador
    const user = await prisma.user.create({
      data: {
        name: 'Usuario Prueba',
        email,
        password: hashedPassword,
        role: 'admin',
        business_id: business.id,
        is_active: true
      }
    });

    // Crear suscripción activa
    const subscription = await prisma.subscription.create({
      data: {
        business_id: business.id,
        plan_type: planType,
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        auto_renew: true,
        payment_method: 'credit_card',
        amount: planType === 'PREMIUM' ? 29.99 : planType === 'BASIC' ? 19.99 : 0,
        currency: 'USD',
        mp_subscription_id: 'test_subscription_' + Date.now()
      }
    });

    // Crear algunos servicios de ejemplo
    await prisma.service.createMany({
      data: [
        {
          business_id: business.id,
          name: 'Corte de Cabello',
          description: 'Corte moderno y profesional',
          duration: 30,
          price: 25.00,
          is_active: true
        },
        {
          business_id: business.id,
          name: 'Tinte',
          description: 'Coloración completa',
          duration: 90,
          price: 65.00,
          is_active: true
        },
        {
          business_id: business.id,
          name: 'Manicura',
          description: 'Cuidado de uñas',
          duration: 45,
          price: 20.00,
          is_active: true
        }
      ]
    });

    res.json({
      success: true,
      message: 'Usuario de prueba creado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      business: {
        id: business.id,
        business_name: business.business_name,
        email: business.email,
        plan_type: business.plan_type,
        subscription_status: business.subscription_status
      },
      subscription: {
        id: subscription.id,
        plan_type: subscription.plan_type,
        status: subscription.status,
        start_date: subscription.start_date,
        end_date: subscription.end_date
      }
    });

  } catch (error) {
    console.error('Error creando usuario de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  registerBusiness,
  login,
  logout,
  getProfile,
  createTestUser
}; 