import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import PricingTable from '../components/PricingTable';
import { subscriptionService } from '../services/subscriptionService';
import { useToast } from '../hooks/useToast';
import { type PlanTier } from '../types/plans';

const PlanSelection: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanTier | undefined>();
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getPlans();
      setPlans(response.data.plans);
      setCurrentPlan(response.data.currentPlan as PlanTier);
    } catch (error) {
      console.error('Error cargando planes:', error);
      showToast('Error cargando planes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelection = async (planTier: PlanTier) => {
    try {
      setProcessingPayment(true);
      setSelectedPlan(planTier);

      // Si es el plan gratuito, activarlo directamente
      if (planTier === 'GRATIS') {
        await activateFreePlan();
        return;
      }

      // Crear suscripción temporal
      const subscriptionResponse = await subscriptionService.createSubscription({
        businessId: '', // Se obtiene del contexto de autenticación
        planType: planTier,
        billingCycle
      });

      if (!subscriptionResponse.data.requiresPayment) {
        // Si no requiere pago, activar directamente
        showToast('Plan activado correctamente', 'success');
        navigate('/dashboard');
        return;
      }

      // Crear pago con MercadoPago
      const paymentResponse = await subscriptionService.createPayment({
        subscriptionId: subscriptionResponse.data.subscription.id
      });

      // Redirigir a MercadoPago
      const initPoint = process.env.NODE_ENV === 'production' 
        ? paymentResponse.data.initPoint 
        : paymentResponse.data.sandboxInitPoint;

      window.location.href = initPoint;

    } catch (error) {
      console.error('Error procesando plan:', error);
      showToast('Error procesando el plan seleccionado', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const activateFreePlan = async () => {
    try {
      // Lógica para activar plan gratuito
      showToast('Plan gratuito activado', 'success');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error activando plan gratuito:', error);
      showToast('Error activando plan gratuito', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Elige tu Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Selecciona el plan que mejor se adapte a las necesidades de tu negocio
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <div className="flex">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'YEARLY'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Anual
                <span className="ml-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  -20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Current Plan Info */}
        {currentPlan && currentPlan !== 'GRATIS' && (
          <div className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800">
                  Plan actual: <strong>{currentPlan}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Table */}
        <div className="mb-12">
          <PricingTable
            currentPlan={currentPlan}
            onSelectPlan={handlePlanSelection}
          />
        </div>

        {/* Processing Overlay */}
        {processingPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
              <h3 className="text-lg font-semibold mb-2">
                Procesando tu selección...
              </h3>
              <p className="text-gray-600">
                {selectedPlan === 'GRATIS' 
                  ? 'Activando plan gratuito...'
                  : 'Redirigiendo a MercadoPago...'
                }
              </p>
            </div>
          </div>
        )}

        {/* Features Comparison */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            Comparación de Funcionalidades
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div key={plan.key} className="text-center">
                <h3 className="font-semibold text-lg mb-4">{plan.name}</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {plan.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            Preguntas Frecuentes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">¿Puedo cambiar de plan en cualquier momento?</h3>
              <p className="text-gray-600 text-sm">
                Sí, puedes cambiar tu plan en cualquier momento. Los cambios se aplicarán inmediatamente.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">¿Hay un período de prueba?</h3>
              <p className="text-gray-600 text-sm">
                Ofrecemos un plan gratuito completo para que puedas probar todas las funcionalidades.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">¿Qué métodos de pago aceptan?</h3>
              <p className="text-gray-600 text-sm">
                Aceptamos todas las tarjetas de crédito y débito, transferencias bancarias y billeteras digitales.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">¿Puedo cancelar mi suscripción?</h3>
              <p className="text-gray-600 text-sm">
                Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de control.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanSelection; 