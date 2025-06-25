const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { prisma } = require('../config/database');

class MercadoPagoService {
  constructor() {
    // Configuración base (para OAuth)
    this.clientId = process.env.MP_CLIENT_ID;
    this.clientSecret = process.env.MP_CLIENT_SECRET;
    this.redirectUri = process.env.MP_REDIRECT_URI || `${process.env.FRONTEND_URL}/dashboard/settings/payments/callback`;
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.mercadopago.com' 
      : 'https://api.mercadopago.com'; // MP no tiene sandbox separado para OAuth
  }

  /**
   * Generar URL de autorización OAuth para conectar cuenta de MP
   */
  generateAuthUrl(businessId, state = null) {
    const stateParam = state || `business_${businessId}_${Date.now()}`;
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      state: stateParam,
      redirect_uri: this.redirectUri
    });

    // URL de autorización según documentación oficial
    return `https://auth.mercadopago.com.ar/authorization?${params.toString()}`;
  }

  /**
   * Intercambiar código de autorización por tokens de acceso
   */
  async exchangeCodeForTokens(code) {
    try {
      const response = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.redirectUri
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('MP OAuth Error Response:', errorText);
        throw new Error(`MP OAuth Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Tokens obtenidos exitosamente de MercadoPago');
      
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_id: data.user_id,
        public_key: data.public_key,
        expires_in: data.expires_in
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Guardar credenciales de MP en la base de datos
   */
  async saveBusinessCredentials(businessId, credentials) {
    try {
      const updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: {
          mp_access_token: credentials.access_token,
          mp_refresh_token: credentials.refresh_token,
          mp_user_id: credentials.user_id,
          mp_public_key: credentials.public_key,
          mp_connected: true,
          mp_connected_at: new Date()
        }
      });

      console.log(`✅ MP credentials saved for business: ${businessId}`);
      return updatedBusiness;
    } catch (error) {
      console.error('Error saving MP credentials:', error);
      throw error;
    }
  }

  /**
   * Obtener cliente de MP configurado para un negocio específico
   */
  async getMPClientForBusiness(businessId) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: {
          mp_access_token: true,
          mp_connected: true,
          name: true
        }
      });

      if (!business || !business.mp_connected || !business.mp_access_token) {
        throw new Error(`Business ${businessId} does not have MercadoPago connected`);
      }

      const client = new MercadoPagoConfig({
        accessToken: business.mp_access_token,
        options: {
          timeout: 5000,
          idempotencyKey: `business_${businessId}_${Date.now()}`
        }
      });

      return { client, business };
    } catch (error) {
      console.error('Error getting MP client for business:', error);
      throw error;
    }
  }

  /**
   * Crear preferencia de pago para una cita
   */
  async createPaymentPreference(appointmentId, businessId) {
    try {
      // Obtener datos de la cita
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          service: true,
          client: true,
          business: true,
          user: true
        }
      });

      if (!appointment) {
        throw new Error(`Appointment ${appointmentId} not found`);
      }

      if (appointment.businessId !== businessId) {
        throw new Error(`Appointment does not belong to business ${businessId}`);
      }

      // Obtener cliente de MP para el negocio
      const { client, business } = await this.getMPClientForBusiness(businessId);
      const preference = new Preference(client);

      // Configurar URLs de retorno
      const baseUrl = process.env.FRONTEND_URL;
      const backUrls = {
        success: `${baseUrl}/booking/payment/success?appointment=${appointmentId}`,
        failure: `${baseUrl}/booking/payment/failure?appointment=${appointmentId}`,
        pending: `${baseUrl}/booking/payment/pending?appointment=${appointmentId}`
      };

      // Crear preferencia
      const preferenceData = {
        items: [
          {
            id: appointment.service.id,
            title: `${appointment.service.name} - ${business.name}`,
            description: appointment.service.description || `Servicio en ${business.name}`,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: parseFloat(appointment.service.price)
          }
        ],
        payer: {
          name: appointment.client.name,
          email: appointment.client.email,
          phone: {
            number: appointment.client.phone || ''
          }
        },
        back_urls: backUrls,
        auto_return: 'approved',
        external_reference: appointmentId,
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        metadata: {
          business_id: businessId,
          appointment_id: appointmentId,
          service_id: appointment.service.id,
          client_id: appointment.client.id
        }
      };

      const result = await preference.create({ body: preferenceData });
      
      // Guardar registro de pago pendiente
      const payment = await prisma.appointmentPayment.create({
        data: {
          business_id: businessId,
          appointment_id: appointmentId,
          mp_preference_id: result.id,
          amount: parseFloat(appointment.service.price),
          currency: 'ARS',
          description: `${appointment.service.name} - ${business.name}`,
          status: 'pending',
          external_reference: appointmentId,
          payer_email: appointment.client.email,
          payer_name: appointment.client.name,
          payer_phone: appointment.client.phone,
          mp_data: result
        }
      });

      // Actualizar cita con referencia al pago
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          payment_id: payment.id,
          payment_status: 'pending'
        }
      });

      console.log(`✅ Payment preference created: ${result.id} for appointment: ${appointmentId}`);

      return {
        preference_id: result.id,
        init_point: result.init_point,
        sandbox_init_point: result.sandbox_init_point,
        payment_id: payment.id,
        amount: appointment.service.price,
        service_name: appointment.service.name,
        business_name: business.name
      };

    } catch (error) {
      console.error('Error creating payment preference:', error);
      throw error;
    }
  }

  /**
   * Procesar webhook de MercadoPago
   */
  async processWebhook(webhookData) {
    try {
      console.log('🔔 Processing MP webhook:', webhookData);

      const { type, data, action } = webhookData;

      if (type === 'payment') {
        await this.processPaymentWebhook(data.id);
      } else if (type === 'merchant_order') {
        await this.processMerchantOrderWebhook(data.id);
      }

      return { success: true };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Procesar webhook de pago
   */
  async processPaymentWebhook(paymentId) {
    try {
      console.log(`🔍 Processing payment webhook for: ${paymentId}`);

      // Buscar el pago en nuestra BD por external_reference
      const payment = await prisma.appointmentPayment.findFirst({
        where: {
          mp_payment_id: paymentId.toString()
        },
        include: {
          appointment: true,
          business: true
        }
      });

      if (!payment) {
        // Si no encontramos por mp_payment_id, buscar por external_reference
        // Esto puede pasar en el primer webhook antes de que actualicemos el mp_payment_id
        console.log(`Payment not found by mp_payment_id, searching by external_reference...`);
        return;
      }

      // Obtener detalles del pago desde MP
      const { client } = await this.getMPClientForBusiness(payment.business_id);
      const mpPayment = new Payment(client);
      const paymentDetails = await mpPayment.get({ id: paymentId });

      console.log(`💳 Payment details from MP:`, {
        id: paymentDetails.id,
        status: paymentDetails.status,
        status_detail: paymentDetails.status_detail,
        external_reference: paymentDetails.external_reference
      });

      // Actualizar pago en nuestra BD
      const updatedPayment = await prisma.appointmentPayment.update({
        where: { id: payment.id },
        data: {
          mp_payment_id: paymentDetails.id.toString(),
          mp_collection_id: paymentDetails.collection_id?.toString(),
          status: paymentDetails.status,
          payment_method: paymentDetails.payment_method_id,
          payment_type: paymentDetails.payment_type_id,
          paid_at: paymentDetails.status === 'approved' ? new Date() : null,
          mp_data: paymentDetails
        }
      });

      // Actualizar estado de la cita
      let appointmentPaymentStatus = 'pending';
      if (paymentDetails.status === 'approved') {
        appointmentPaymentStatus = 'paid';
      } else if (paymentDetails.status === 'rejected' || paymentDetails.status === 'cancelled') {
        appointmentPaymentStatus = 'failed';
      }

      await prisma.appointment.update({
        where: { id: payment.appointment_id },
        data: {
          payment_status: appointmentPaymentStatus
        }
      });

      console.log(`✅ Payment processed: ${paymentDetails.id} - Status: ${paymentDetails.status}`);

      return updatedPayment;
    } catch (error) {
      console.error('Error processing payment webhook:', error);
      throw error;
    }
  }

  /**
   * Procesar webhook de merchant order
   */
  async processMerchantOrderWebhook(merchantOrderId) {
    try {
      console.log(`🛒 Processing merchant order webhook for: ${merchantOrderId}`);
      // Implementar si necesitas lógica específica para merchant orders
      return { success: true };
    } catch (error) {
      console.error('Error processing merchant order webhook:', error);
      throw error;
    }
  }

  /**
   * Obtener estado de pago de una cita
   */
  async getPaymentStatus(appointmentId) {
    try {
      const payment = await prisma.appointmentPayment.findFirst({
        where: { appointment_id: appointmentId },
        include: {
          appointment: true
        }
      });

      if (!payment) {
        return { status: 'not_found', payment: null };
      }

      return {
        status: payment.status,
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          description: payment.description,
          payment_method: payment.payment_method,
          paid_at: payment.paid_at,
          created_at: payment.created_at
        }
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Verificar si un negocio tiene MP conectado
   */
  async isBusinessConnected(businessId) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { mp_connected: true, mp_access_token: true }
      });

      return business?.mp_connected && business?.mp_access_token;
    } catch (error) {
      console.error('Error checking business connection:', error);
      return false;
    }
  }

  /**
   * Desconectar cuenta de MP
   */
  async disconnectBusiness(businessId) {
    try {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          mp_access_token: null,
          mp_refresh_token: null,
          mp_user_id: null,
          mp_public_key: null,
          mp_connected: false,
          mp_connected_at: null
        }
      });

      console.log(`✅ MP disconnected for business: ${businessId}`);
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting business:', error);
      throw error;
    }
  }
}

module.exports = new MercadoPagoService(); 