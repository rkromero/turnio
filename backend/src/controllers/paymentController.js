const { prisma } = require('../config/database');
const mercadoPagoService = require('../services/mercadoPagoService');
const { validationResult } = require('express-validator');

// Conectar cuenta de MercadoPago (OAuth)
const connectMercadoPago = async (req, res) => {
  try {
    const businessId = req.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    // Generar URL de autorización
    const authUrl = mercadoPagoService.generateAuthUrl(businessId);

    res.json({
      success: true,
      data: {
        auth_url: authUrl,
        business_id: businessId
      }
    });

  } catch (error) {
    console.error('Error connecting MercadoPago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Callback de OAuth de MercadoPago
const mercadoPagoCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: `OAuth error: ${error}`,
        error_description: req.query.error_description
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }

    // Extraer businessId del state
    const businessId = state.split('_')[1];
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid state parameter'
      });
    }

    // Intercambiar código por tokens
    const credentials = await mercadoPagoService.exchangeCodeForTokens(code);

    // Guardar credenciales en la base de datos
    await mercadoPagoService.saveBusinessCredentials(businessId, credentials);

    res.json({
      success: true,
      message: 'MercadoPago conectado exitosamente',
      data: {
        business_id: businessId,
        user_id: credentials.user_id,
        connected_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error in MercadoPago callback:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando autorización de MercadoPago'
    });
  }
};

// Verificar estado de conexión de MercadoPago
const getConnectionStatus = async (req, res) => {
  try {
    const businessId = req.businessId;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        mp_connected: true,
        mp_connected_at: true,
        mp_user_id: true
      }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        connected: business.mp_connected || false,
        connected_at: business.mp_connected_at,
        mp_user_id: business.mp_user_id
      }
    });

  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Desconectar MercadoPago
const disconnectMercadoPago = async (req, res) => {
  try {
    const businessId = req.businessId;

    await mercadoPagoService.disconnectBusiness(businessId);

    res.json({
      success: true,
      message: 'MercadoPago desconectado exitosamente'
    });

  } catch (error) {
    console.error('Error disconnecting MercadoPago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear preferencia de pago para una cita
const createPaymentPreference = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { appointmentId } = req.body;
    const businessId = req.businessId;

    // Verificar que el negocio tiene MP conectado
    const isConnected = await mercadoPagoService.isBusinessConnected(businessId);
    if (!isConnected) {
      return res.status(400).json({
        success: false,
        message: 'Debes conectar tu cuenta de MercadoPago primero',
        error_code: 'MP_NOT_CONNECTED'
      });
    }

    // Verificar que la cita existe y pertenece al negocio
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        businessId: businessId
      },
      include: {
        service: true,
        client: true,
        payment: true
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Verificar que no tenga ya un pago exitoso
    if (appointment.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Esta cita ya está pagada'
      });
    }

    // Crear preferencia de pago
    const preference = await mercadoPagoService.createPaymentPreference(appointmentId, businessId);

    res.json({
      success: true,
      message: 'Preferencia de pago creada exitosamente',
      data: preference
    });

  } catch (error) {
    console.error('Error creating payment preference:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Webhook de MercadoPago
const webhook = async (req, res) => {
  try {
    console.log('🔔 Webhook received from MercadoPago:', req.body);

    // MercadoPago envía diferentes tipos de notificaciones
    const webhookData = req.body;

    // Procesar webhook
    await mercadoPagoService.processWebhook(webhookData);

    // Responder rápidamente a MP (importante para evitar reintentos)
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    // Aún así responder 200 para evitar reintentos innecesarios
    res.status(200).json({ success: false, error: error.message });
  }
};

// Obtener estado de pago de una cita
const getPaymentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const paymentStatus = await mercadoPagoService.getPaymentStatus(appointmentId);

    res.json({
      success: true,
      data: paymentStatus
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener historial de pagos del negocio
const getPaymentHistory = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const where = { business_id: businessId };

    // Filtros opcionales
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const [payments, total] = await Promise.all([
      prisma.appointmentPayment.findMany({
        where,
        include: {
          appointment: {
            include: {
              service: true,
              client: true,
              user: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.appointmentPayment.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Configurar ajustes de pagos
const updatePaymentSettings = async (req, res) => {
  try {
    const businessId = req.businessId;
    const { require_payment, payment_deadline_hours, auto_cancel_unpaid } = req.body;

    const settings = await prisma.paymentSettings.upsert({
      where: { business_id: businessId },
      update: {
        require_payment: require_payment,
        payment_deadline_hours: payment_deadline_hours,
        auto_cancel_unpaid: auto_cancel_unpaid
      },
      create: {
        business_id: businessId,
        require_payment: require_payment || false,
        payment_deadline_hours: payment_deadline_hours || 24,
        auto_cancel_unpaid: auto_cancel_unpaid || false
      }
    });

    res.json({
      success: true,
      message: 'Configuración de pagos actualizada',
      data: settings
    });

  } catch (error) {
    console.error('Error updating payment settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener configuración de pagos
const getPaymentSettings = async (req, res) => {
  try {
    const businessId = req.businessId;

    const settings = await prisma.paymentSettings.findUnique({
      where: { business_id: businessId }
    });

    res.json({
      success: true,
      data: settings || {
        require_payment: false,
        payment_deadline_hours: 24,
        auto_cancel_unpaid: false
      }
    });

  } catch (error) {
    console.error('Error getting payment settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  connectMercadoPago,
  mercadoPagoCallback,
  getConnectionStatus,
  disconnectMercadoPago,
  createPaymentPreference,
  webhook,
  getPaymentStatus,
  getPaymentHistory,
  updatePaymentSettings,
  getPaymentSettings
}; 