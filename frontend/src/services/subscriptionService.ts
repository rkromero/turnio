import axios from 'axios';

interface Plan {
  key: string;
  name: string;
  description: string;
  pricing: {
    monthly: {
      price: number;
      displayPrice: number;
      cycle: string;
    };
    yearly: {
      price: number;
      displayPrice: number;
      totalPrice: number;
      savings: number;
      savingsPercentage: number;
      cycle: string;
    };
  };
  limits: {
    appointments: number;
    services: number;
    users: number;
  };
  features: string[];
}

interface PlansResponse {
  success: boolean;
  data: {
    currentPlan: string;
    plans: Plan[];
    currency: string;
  };
}

interface CreateSubscriptionRequest {
  businessId: string;
  planType: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
}

interface CreateSubscriptionResponse {
  success: boolean;
  data: {
    subscription: {
      id: string;
      planType: string;
      billingCycle: string;
      priceAmount: number;
      status: string;
    };
    requiresPayment: boolean;
  };
}

interface CreatePaymentRequest {
  subscriptionId: string;
}

interface CreatePaymentResponse {
  success: boolean;
  data: {
    preferenceId: string;
    publicKey: string;
    initPoint: string;
    sandboxInitPoint: string;
    paymentId: string;
    subscription: {
      id: string;
      planType: string;
      billingCycle: string;
      amount: number;
    };
  };
}

class SubscriptionService {
  private baseUrl = (import.meta.env.VITE_API_URL || 'https://turnio-backend-production.up.railway.app') + '/api';
  private api = axios.create({
    baseURL: this.baseUrl,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Interceptor para agregar el token en el header Authorization
  constructor() {
    this.api.interceptors.request.use((config) => {
      // Obtener el token de la cookie
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
      const token = tokenCookie ? tokenCookie.split('=')[1] : null;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });
  }

  // Obtener planes disponibles
  async getPlans(): Promise<PlansResponse> {
    try {
      console.log('🔍 Llamando a getPlans...');
      const url = '/subscriptions/plans';
      console.log('🔍 URL:', url);
      
      const response = await this.api.get(url);
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', response.headers);
      console.log('🔍 Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error en getPlans:', error);
      throw error;
    }
  }

  // Crear suscripción
  async createSubscription(request: CreateSubscriptionRequest, token?: string): Promise<CreateSubscriptionResponse> {
    try {
      const config = token ? {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      } : {};
      
      const response = await this.api.post('/subscriptions/create-temp', request, config);
      return response.data;
    } catch (error) {
      console.error('Error en createSubscription:', error);
      throw error;
    }
  }

  // Crear pago con MercadoPago
  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      const response = await this.api.post('/mercadopago/create-payment', request);
      return response.data;
    } catch (error) {
      console.error('Error en createPayment:', error);
      throw error;
    }
  }

  // Verificar estado de pago
  async checkPaymentStatus(paymentId: string) {
    try {
      const response = await this.api.get(`/mercadopago/payment-status/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Error en checkPaymentStatus:', error);
      throw error;
    }
  }

  // Obtener suscripción actual
  async getCurrentSubscription() {
    try {
      const response = await this.api.get('/subscriptions/current');
      return response.data;
    } catch (error) {
      console.error('Error en getCurrentSubscription:', error);
      throw error;
    }
  }

  // Cancelar suscripción
  async cancelSubscription(reason?: string) {
    try {
      const response = await this.api.post('/subscriptions/cancel', { reason });
      return response.data;
    } catch (error) {
      console.error('Error en cancelSubscription:', error);
      throw error;
    }
  }

  // Obtener historial de pagos
  async getPaymentHistory(page = 1, limit = 10) {
    try {
      const response = await this.api.get(`/subscriptions/payments?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error en getPaymentHistory:', error);
      throw error;
    }
  }

  // Cambiar plan de suscripción (maneja usuarios con y sin suscripción)
  async changePlan(subscriptionId: string | null, newPlanType: string) {
    try {
      console.log(`🔄 Cambiando plan: ${subscriptionId || 'sin suscripción'} → ${newPlanType}`);
      const response = await this.api.post('/subscriptions/change-plan', {
        subscriptionId,
        newPlanType
      });
      return response.data;
    } catch (error) {
      console.error('Error en changePlan:', error);
      throw error;
    }
  }

  // Procesar pago de upgrade
  async processUpgradePayment(paymentId: string) {
    try {
      console.log(`💳 Procesando pago de upgrade: ${paymentId}`);
      const response = await this.api.post('/subscriptions/process-upgrade-payment', {
        paymentId
      });
      return response.data;
    } catch (error) {
      console.error('Error en processUpgradePayment:', error);
      throw error;
    }
  }

  // Procesar pago de downgrade
  async processDowngradePayment(paymentId: string) {
    try {
      console.log(`💳 Procesando pago de downgrade: ${paymentId}`);
      const response = await this.api.post('/subscriptions/process-downgrade-payment', {
        paymentId
      });
      return response.data;
    } catch (error) {
      console.error('Error en processDowngradePayment:', error);
      throw error;
    }
  }

  // Procesar downgrades pendientes
  async processPendingDowngrades() {
    try {
      console.log('🔍 Procesando downgrades pendientes...');
      const response = await this.api.post('/subscriptions/process-pending-downgrades');
      return response.data;
    } catch (error) {
      console.error('Error en processPendingDowngrades:', error);
      throw error;
    }
  }

  // Obtener historial de cambios de plan
  async getPlanChangeHistory(businessId: string) {
    try {
      const response = await this.api.get(`/subscriptions/plan-change-history/${businessId}`);
      return response.data;
    } catch (error) {
      console.error('Error en getPlanChangeHistory:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
export type { Plan, PlansResponse, CreateSubscriptionRequest, CreateSubscriptionResponse }; 