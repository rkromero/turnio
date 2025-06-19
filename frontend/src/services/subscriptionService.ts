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

  // Obtener planes disponibles
  async getPlans(): Promise<PlansResponse> {
    try {
      console.log('🔍 Llamando a getPlans...');
      const url = `${this.baseUrl}/subscriptions/plans`;
      console.log('🔍 URL:', url);
      
      const response = await fetch(url);
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Obtener el texto de la respuesta primero
      const responseText = await response.text();
      console.log('🔍 Response text (first 500 chars):', responseText.substring(0, 500));
      
      // Intentar parsear como JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Error parseando JSON:', parseError);
        console.error('❌ Response text:', responseText);
        throw new Error(`Respuesta no es JSON válido. Status: ${response.status}. Respuesta: ${responseText.substring(0, 200)}`);
      }
      
      if (!response.ok) {
        throw new Error(data.message || `Error HTTP ${response.status}: ${responseText.substring(0, 200)}`);
      }
      
      console.log('✅ Planes obtenidos correctamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getPlans:', error);
      throw error;
    }
  }

  // Crear suscripción
  async createSubscription(request: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/create-temp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Incluir cookies automáticamente
        body: JSON.stringify(request)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error creando suscripción');
      }
      
      return data;
    } catch (error) {
      console.error('Error en createSubscription:', error);
      throw error;
    }
  }

  // Crear pago con MercadoPago
  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      // Obtener el token de la cookie
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
      const token = tokenCookie ? tokenCookie.split('=')[1] : null;

      const response = await fetch(`${this.baseUrl}/mercadopago/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', // Incluir cookies automáticamente
        body: JSON.stringify(request)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error creando pago');
      }
      
      return data;
    } catch (error) {
      console.error('Error en createPayment:', error);
      throw error;
    }
  }

  // Verificar estado de pago
  async checkPaymentStatus(paymentId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/mercadopago/payment-status/${paymentId}`, {
        credentials: 'include' // Incluir cookies automáticamente
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error verificando estado del pago');
      }
      
      return data;
    } catch (error) {
      console.error('Error en checkPaymentStatus:', error);
      throw error;
    }
  }

  // Obtener suscripción actual
  async getCurrentSubscription() {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/current`, {
        credentials: 'include' // Incluir cookies automáticamente
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error obteniendo suscripción actual');
      }
      
      return data;
    } catch (error) {
      console.error('Error en getCurrentSubscription:', error);
      throw error;
    }
  }

  // Cancelar suscripción
  async cancelSubscription(reason?: string) {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Incluir cookies automáticamente
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error cancelando suscripción');
      }
      
      return data;
    } catch (error) {
      console.error('Error en cancelSubscription:', error);
      throw error;
    }
  }

  // Obtener historial de pagos
  async getPaymentHistory(page = 1, limit = 10) {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/payments?page=${page}&limit=${limit}`, {
        credentials: 'include' // Incluir cookies automáticamente
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error obteniendo historial de pagos');
      }
      
      return data;
    } catch (error) {
      console.error('Error en getPaymentHistory:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
export type { Plan, PlansResponse, CreateSubscriptionRequest, CreateSubscriptionResponse }; 