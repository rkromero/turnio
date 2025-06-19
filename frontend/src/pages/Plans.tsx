import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, Crown, Building2, Zap, Rocket } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { useToast } from '../hooks/useToast';

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
  isCurrent?: boolean;
}

const Plans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { error } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getPlans();
      setPlans(response.data.plans);
      setCurrentPlan(response.data.currentPlan || 'FREE');
    } catch (err) {
      console.error('Error cargando planes:', err);
      error('Error cargando planes');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (planKey: string) => {
    if (planKey === currentPlan) {
      error('Ya tienes este plan activo');
      return;
    }

    // Redirigir a la página de selección de planes
    navigate('/plans');
  };

  const getPlanIcon = (planKey: string) => {
    switch (planKey) {
      case 'FREE': return <Zap className="w-6 h-6" />;
      case 'BASIC': return <Rocket className="w-6 h-6" />;
      case 'PREMIUM': return <Crown className="w-6 h-6" />;
      case 'ENTERPRISE': return <Building2 className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planKey: string) => {
    switch (planKey) {
      case 'FREE': return 'blue';
      case 'BASIC': return 'purple';
      case 'PREMIUM': return 'amber';
      case 'ENTERPRISE': return 'emerald';
      default: return 'blue';
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratis';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu Plan Actual</h1>
        <p className="text-gray-600">
          Gestiona tu suscripción y explora opciones para mejorar tu experiencia
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Plan Actual</h2>
          <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
            Activo
          </span>
        </div>

        {plans.find(p => p.key === currentPlan) && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
            <div className="flex items-center mb-4">
              {getPlanIcon(currentPlan)}
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {plans.find(p => p.key === currentPlan)?.name}
                </h3>
                <p className="text-gray-600">
                  {plans.find(p => p.key === currentPlan)?.description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {plans.find(p => p.key === currentPlan)?.limits.appointments === -1 
                    ? '∞' 
                    : plans.find(p => p.key === currentPlan)?.limits.appointments}
                </div>
                <div className="text-sm text-gray-600">Citas/mes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {plans.find(p => p.key === currentPlan)?.limits.services === -1 
                    ? '∞' 
                    : plans.find(p => p.key === currentPlan)?.limits.services}
                </div>
                <div className="text-sm text-gray-600">Servicios</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {plans.find(p => p.key === currentPlan)?.limits.users === -1 
                    ? '∞' 
                    : plans.find(p => p.key === currentPlan)?.limits.users}
                </div>
                <div className="text-sm text-gray-600">Usuarios</div>
              </div>
            </div>

            <div className="text-center">
              <span className="text-3xl font-bold text-gray-900">
                {formatPrice(plans.find(p => p.key === currentPlan)?.pricing.monthly.price || 0)}
              </span>
              <span className="text-gray-600">/mes</span>
            </div>
          </div>
        )}
      </div>

      {/* Available Plans */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Planes Disponibles</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const color = getPlanColor(plan.key);
            const isCurrent = plan.key === currentPlan;
            const isUpgrade = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'].indexOf(plan.key) > 
                             ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'].indexOf(currentPlan);

            return (
              <div
                key={plan.key}
                className={`relative rounded-lg border-2 p-6 transition-all ${
                  isCurrent
                    ? 'border-green-500 bg-green-50'
                    : isUpgrade
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Badge */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      PLAN ACTUAL
                    </span>
                  </div>
                )}

                {isUpgrade && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      RECOMENDADO
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-4">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${color}-100 text-${color}-600 mb-3`}>
                    {getPlanIcon(plan.key)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-4">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPrice(plan.pricing.monthly.price)}
                  </span>
                  <span className="text-gray-600">/mes</span>
                </div>

                {/* Limits */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Citas:</span>
                    <span className="font-medium">
                      {plan.limits.appointments === -1 ? 'Ilimitadas' : plan.limits.appointments}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Servicios:</span>
                    <span className="font-medium">
                      {plan.limits.services === -1 ? 'Ilimitados' : plan.limits.services}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Usuarios:</span>
                    <span className="font-medium">
                      {plan.limits.users === -1 ? 'Ilimitados' : plan.limits.users}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <ul className="space-y-1 text-xs text-gray-600">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <li className="text-purple-600 font-medium">
                        +{plan.features.length - 3} más...
                      </li>
                    )}
                  </ul>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={isCurrent}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : isUpgrade
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isCurrent ? 'Plan Actual' : 'Cambiar Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Información de Facturación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Próxima Facturación</h3>
            <p className="text-gray-600">Tu próxima factura se generará automáticamente</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Método de Pago</h3>
            <p className="text-gray-600">Gestionado por MercadoPago</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans; 