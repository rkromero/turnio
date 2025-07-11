import React, { useState } from 'react';
import { CreditCard, Users, Calendar, Wrench, TrendingUp, Check, X, ArrowRight, Zap, Crown, Sparkles } from 'lucide-react';
import { planService } from '../../services/api';
import { subscriptionService } from '../../services/subscriptionService';
import toast from 'react-hot-toast';
import type { PlanUsage, AvailablePlansResponse, AvailablePlan } from '../../types';

interface PlanUsageTabProps {
  planUsage: PlanUsage | null;
  onPlanChanged?: () => void;
}

// Los planes del frontend y backend usan las mismas claves
// FREE, BASIC, PREMIUM, ENTERPRISE

const PLAN_FEATURES = {
  FREE: {
    name: 'Plan Gratuito',
    icon: '🆓',
    color: 'gray',
    features: [
      { name: 'Hasta 30 citas por mes', included: true },
      { name: 'Hasta 3 servicios', included: true },
      { name: '1 usuario/empleado', included: true },
      { name: 'Reservas públicas', included: true },
      { name: 'Dashboard básico', included: true },
      { name: 'Recordatorios por email', included: false },
      { name: 'Reportes avanzados', included: false },
      { name: 'Personalización de marca', included: false },
      { name: 'Soporte prioritario', included: false }
    ]
  },
  BASIC: {
    name: 'Plan Básico',
    icon: '💼',
    color: 'blue',
    features: [
      { name: 'Hasta 100 citas por mes', included: true },
      { name: 'Hasta 10 servicios', included: true },
      { name: 'Hasta 3 usuarios/empleados', included: true },
      { name: 'Reservas públicas', included: true },
      { name: 'Dashboard completo', included: true },
      { name: 'Recordatorios por email', included: true },
      { name: 'Reportes básicos', included: true },
      { name: 'Personalización de marca', included: false },
      { name: 'Soporte prioritario', included: false }
    ]
  },
  PREMIUM: {
    name: 'Plan Premium',
    icon: '⭐',
    color: 'purple',
    features: [
      { name: 'Hasta 500 citas por mes', included: true },
      { name: 'Hasta 25 servicios', included: true },
      { name: 'Hasta 10 usuarios/empleados', included: true },
      { name: 'Reservas públicas', included: true },
      { name: 'Dashboard avanzado', included: true },
      { name: 'Recordatorios por email y SMS', included: true },
      { name: 'Reportes avanzados', included: true },
      { name: 'Personalización de marca', included: true },
      { name: 'Soporte prioritario', included: false }
    ]
  },
  ENTERPRISE: {
    name: 'Plan Empresa',
    icon: '👑',
    color: 'gold',
    features: [
      { name: 'Citas ilimitadas', included: true },
      { name: 'Servicios ilimitados', included: true },
      { name: 'Usuarios/empleados ilimitados', included: true },
      { name: 'Reservas públicas', included: true },
      { name: 'Dashboard avanzado', included: true },
      { name: 'Recordatorios por email y SMS', included: true },
      { name: 'Reportes completos', included: true },
      { name: 'Personalización completa de marca', included: true },
      { name: 'Soporte prioritario 24/7', included: true }
    ]
  }
};

const ProgressBar: React.FC<{ current: number; limit: number; color?: string; className?: string }> = ({ 
  current, 
  limit, 
  color = 'primary',
  className = ''
}) => {
  const percentage = limit === -1 ? 0 : Math.min((current / limit) * 100, 100);
  const isOverLimit = limit !== -1 && current > limit;
  
  return (
    <div className={`progress-bar ${className}`}>
      <div
        className={`progress-fill ${
          isOverLimit ? 'bg-red-500' : 
          color === 'primary' ? 'bg-purple-600' : `bg-${color}-500`
        }`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

const PlanCard: React.FC<{ 
  plan: AvailablePlan; 
  onSelect: (planKey: string) => void;
  isChanging: boolean;
}> = ({ plan, onSelect, isChanging }) => {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    gray: 'from-gray-50 to-gray-100 border-gray-200',
    gold: 'from-yellow-50 to-yellow-100 border-yellow-200'
  };
  
  const buttonClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    gray: 'bg-gray-600 hover:bg-gray-700',
    gold: 'bg-yellow-600 hover:bg-yellow-700'
  };

  const features = PLAN_FEATURES[plan.key as keyof typeof PLAN_FEATURES];
  const colorKey = features.color as keyof typeof colorClasses;

  return (
    <div className={`relative rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${
      plan.isCurrent 
        ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 scale-105 shadow-lg ring-4 ring-purple-200' 
        : `bg-gradient-to-br ${colorClasses[colorKey]} hover:shadow-md`
    }`}>
      {plan.isCurrent && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold flex items-center shadow-lg">
            <Crown className="w-4 h-4 mr-1.5" />
            Plan Actual
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <div className="text-3xl mb-2">{features.icon}</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
        <div className="flex items-baseline justify-center mb-4">
          <span className="text-3xl font-bold text-gray-900">
            {plan.price === 0 ? 'Gratis' : `$${plan.price.toLocaleString()}`}
          </span>
          {plan.price > 0 && <span className="text-gray-500 ml-1">/mes</span>}
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.slice(0, 5).map((feature, index) => (
          <li key={index} className="flex items-start text-sm">
            <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {!plan.isCurrent && (
        <button
          onClick={() => onSelect(plan.key)}
          disabled={isChanging}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            buttonClasses[colorKey]
          }`}
        >
          {isChanging ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Cambiando...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Sparkles className="w-4 h-4 mr-2" />
              Seleccionar Plan
            </div>
          )}
        </button>
      )}
    </div>
  );
};

const PlanUsageTab: React.FC<PlanUsageTabProps> = ({ planUsage, onPlanChanged }) => {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<AvailablePlansResponse | null>(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  const loadAvailablePlans = async () => {
    try {
      setIsLoadingPlans(true);
      const data = await planService.getAvailablePlans();
      setAvailablePlans(data);
    } catch (error) {
      console.error('Error cargando planes:', error);
      toast.error('Error al cargar los planes disponibles');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleChangePlan = async (newPlanKey: string) => {
    try {
      setIsChangingPlan(true);
      
      console.log(`🔄 Iniciando cambio de plan: ${newPlanKey}`);
      
      // Para plan FREE, usar el endpoint antiguo que funciona bien
      if (newPlanKey === 'FREE') {
        await planService.changePlan(newPlanKey);
        toast.success('Plan actualizado exitosamente');
        setShowPlanModal(false);
        if (onPlanChanged) {
          onPlanChanged();
        }
        return;
      }
      
      // Para planes pagados, usar el sistema de suscripciones
      const response = await subscriptionService.changePlan(null, newPlanKey);
      
      if (response.success) {
        if (response.data.requiresPayment) {
          // Crear el pago de MercadoPago
          const paymentResponse = await subscriptionService.createPayment({
            subscriptionId: response.data.subscription.id
          });
          
          if (paymentResponse.success) {
            toast.success('Redirigiendo al checkout...');
            setShowPlanModal(false);
            
            // Redirigir al checkout de MercadoPago
            const checkoutUrl = paymentResponse.data.initPoint || paymentResponse.data.sandboxInitPoint;
            window.location.href = checkoutUrl;
          } else {
            throw new Error('Error al crear el pago');
          }
        } else {
          // Plan cambiado directamente (sin pago)
          toast.success('Plan actualizado exitosamente');
          setShowPlanModal(false);
          if (onPlanChanged) {
            onPlanChanged();
          }
        }
      } else {
        throw new Error(response.message || 'Error al cambiar el plan');
      }
      
    } catch (error: unknown) {
      console.error('❌ Error en handleChangePlan:', error);
      
      let message = 'Error al cambiar el plan';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message = axiosError.response?.data?.message || message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        message = (error as { message: string }).message;
      }
      
      toast.error(message);
    } finally {
      setIsChangingPlan(false);
    }
  };

  const openPlanModal = () => {
    setShowPlanModal(true);
    loadAvailablePlans();
  };

  if (!planUsage) {
    return (
      <div className="p-6 text-center">
        <div className="skeleton-card">
          <div className="animate-shimmer h-6 bg-gray-200 rounded mb-4"></div>
          <div className="animate-shimmer h-4 bg-gray-200 rounded mb-2"></div>
          <div className="animate-shimmer h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const currentPlan = PLAN_FEATURES[planUsage.planType];
  const isOverAppointmentLimit = planUsage.usage.appointments.current > planUsage.usage.appointments.limit && 
                                planUsage.usage.appointments.limit !== -1;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <CreditCard className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Información del Plan</h3>
            <p className="text-sm text-gray-600">
              Revisa el uso actual de tu plan y las características disponibles
            </p>
          </div>
        </div>
        <button
          onClick={openPlanModal}
          className="btn-primary w-full sm:w-auto flex items-center justify-center space-x-2"
        >
          <Zap className="w-4 h-4" />
          <span>Cambiar Plan</span>
        </button>
      </div>

      {/* Plan actual */}
      <div className="card-modern">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{currentPlan.icon}</div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900">
                  {currentPlan.name}
                </h4>
                <p className="text-sm text-gray-600">Tu plan actual</p>
              </div>
            </div>
            <div className={`badge badge-${currentPlan.color === 'gray' ? 'gray' : 'primary'} text-sm px-4 py-2`}>
              {planUsage.planType}
            </div>
          </div>

          {/* Estadísticas de uso */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {/* Citas */}
            <div className="stats-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Citas este mes</span>
                </div>
                <span className={`text-sm font-bold ${
                  isOverAppointmentLimit ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {planUsage.usage.appointments.current}/{planUsage.usage.appointments.limit === -1 ? '∞' : planUsage.usage.appointments.limit}
                </span>
              </div>
              <ProgressBar 
                current={planUsage.usage.appointments.current} 
                limit={planUsage.usage.appointments.limit}
                color={isOverAppointmentLimit ? 'red' : 'primary'}
                className="mb-2"
              />
              {isOverAppointmentLimit && (
                <p className="text-xs text-red-600 font-medium">⚠️ Has excedido el límite de tu plan</p>
              )}
            </div>

            {/* Servicios */}
            <div className="stats-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Servicios activos</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {planUsage.usage.services.current}/{planUsage.usage.services.limit === -1 ? '∞' : planUsage.usage.services.limit}
                </span>
              </div>
              <ProgressBar 
                current={planUsage.usage.services.current} 
                limit={planUsage.usage.services.limit}
                color="blue"
                className="mb-2"
              />
              <div className="text-xs text-gray-500">
                {planUsage.usage.services.percentage.toFixed(0)}% utilizado
              </div>
            </div>

            {/* Usuarios */}
            <div className="stats-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Usuarios activos</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {planUsage.usage.users.current}/{planUsage.usage.users.limit === -1 ? '∞' : planUsage.usage.users.limit}
                </span>
              </div>
              <ProgressBar 
                current={planUsage.usage.users.current} 
                limit={planUsage.usage.users.limit}
                color="green"
                className="mb-2"
              />
              <div className="text-xs text-gray-500">
                {planUsage.usage.users.percentage.toFixed(0)}% utilizado
              </div>
            </div>
          </div>

          {/* Estadística adicional */}
          <div className="info-card">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Total de clientes registrados: <span className="font-bold">{planUsage.usage.clients.total}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Características del plan */}
      <div className="card">
        <div className="card-header">
          <h4 className="text-lg font-semibold text-gray-900">
            Características de tu plan
          </h4>
        </div>
        <div className="divide-y divide-gray-200">
          {currentPlan.features.map((feature, index) => (
            <div key={index} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
              <span className="text-sm text-gray-700 flex-1">{feature.name}</span>
              <div className="flex items-center ml-4">
                {feature.included ? (
                  <div className="flex items-center text-green-600">
                    <Check className="h-5 w-5" />
                    <span className="ml-1 text-xs font-medium hidden sm:inline">Incluido</span>
                  </div>
                ) : (
                  <div className="flex items-center text-gray-400">
                    <X className="h-5 w-5" />
                    <span className="ml-1 text-xs font-medium hidden sm:inline">No incluido</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recomendaciones */}
      {(isOverAppointmentLimit || planUsage.usage.services.percentage > 80 || planUsage.usage.users.percentage > 80) && (
        <div className="warning-card">
          <h4 className="text-sm font-medium text-yellow-900 mb-3 flex items-center">
            <span className="text-lg mr-2">💡</span>
            Recomendaciones
          </h4>
          <ul className="text-sm text-yellow-800 space-y-2">
            {isOverAppointmentLimit && (
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Has excedido el límite de citas de tu plan. Considera actualizar a un plan superior.</span>
              </li>
            )}
            {planUsage.usage.services.percentage > 80 && (
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Estás cerca del límite de servicios. Considera actualizar tu plan si necesitas más servicios.</span>
              </li>
            )}
            {planUsage.usage.users.percentage > 80 && (
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Estás cerca del límite de usuarios. Actualiza tu plan para agregar más miembros del equipo.</span>
              </li>
            )}
          </ul>
          <div className="mt-4">
            <button
              onClick={openPlanModal}
              className="text-yellow-800 hover:text-yellow-900 font-medium flex items-center space-x-1 transition-colors duration-200"
            >
              <span>Ver planes disponibles</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de cambio de plan */}
      {showPlanModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Cambiar Plan</h2>
                  <p className="text-gray-600 mt-1">Selecciona el plan que mejor se adapte a tu negocio</p>
                </div>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {isLoadingPlans ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando planes...</p>
                </div>
              ) : availablePlans ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {availablePlans.plans.map((plan) => (
                    <PlanCard
                      key={plan.key}
                      plan={plan}
                      onSelect={handleChangePlan}
                      isChanging={isChangingPlan}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-4xl mb-4">😕</div>
                  <p className="text-gray-600">Error al cargar los planes</p>
                  <button
                    onClick={loadAvailablePlans}
                    className="btn-secondary mt-4"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Información de contacto */}
      <div className="info-card">
        <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
          <span className="text-lg mr-2">🤝</span>
          ¿Necesitas ayuda con tu plan?
        </h4>
        <p className="text-sm text-blue-800 leading-relaxed">
          Si tienes preguntas sobre las características disponibles o necesitas ayuda para elegir el plan correcto, 
          no dudes en contactarnos. Estamos aquí para ayudarte a encontrar el plan perfecto para tu negocio.
        </p>
      </div>
    </div>
  );
};

export default PlanUsageTab; 