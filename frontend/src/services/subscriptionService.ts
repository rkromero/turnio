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
  private baseUrl = '/api';

  // Obtener planes disponibles
  async getPlans(): Promise<PlansResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/plans`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error obteniendo planes');
      }
      
      return data;
    } catch (error) {
      console.error('Error en getPlans:', error);
      throw error;
    }
  }

  // Crear suscripción
  async createSubscription(request: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${this.baseUrl}/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${this.baseUrl}/mercadopago/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${this.baseUrl}/mercadopago/payment-status/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${this.baseUrl}/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${this.baseUrl}/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${this.baseUrl}/subscriptions/payments?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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