import React, { useState } from 'react';
import { CreditCard, Users, Calendar, Wrench, TrendingUp, Check, X, ArrowRight, Zap, Crown } from 'lucide-react';
import { planService } from '../../services/api';
import toast from 'react-hot-toast';
import type { PlanUsage, AvailablePlansResponse, AvailablePlan } from '../../types';

interface PlanUsageTabProps {
  planUsage: PlanUsage | null;
  onPlanChanged?: () => void;
}

const PLAN_FEATURES = {
  FREE: {
    name: 'Plan Gratuito',
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

const ProgressBar: React.FC<{ current: number; limit: number; color?: string }> = ({ 
  current, 
  limit, 
  color = 'primary' 
}) => {
  const percentage = limit === -1 ? 0 : Math.min((current / limit) * 100, 100);
  const isOverLimit = limit !== -1 && current > limit;
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${
          isOverLimit ? 'bg-red-500' : 
          color === 'primary' ? 'bg-primary-600' : `bg-${color}-600`
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
    blue: 'border-blue-200 bg-blue-50',
    purple: 'border-purple-200 bg-purple-50',
    gray: 'border-gray-200 bg-gray-50',
    gold: 'border-yellow-200 bg-yellow-50'
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
    <div className={`relative border-2 rounded-xl p-6 transition-all ${
      plan.isCurrent 
        ? 'border-purple-500 bg-purple-50 scale-105 shadow-lg' 
        : `${colorClasses[colorKey]} hover:shadow-md`
    }`}>
      {plan.isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
            <Crown className="w-4 h-4 mr-1" />
            Plan Actual
          </div>
        </div>
      )}

      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
        <p className="text-gray-600 text-sm mb-3">{plan.description}</p>
        <div className="flex items-baseline justify-center mb-4">
          <span className="text-3xl font-bold text-gray-900">
            ${plan.price === 0 ? 'Gratis' : plan.price.toLocaleString()}
          </span>
          {plan.price > 0 && <span className="text-gray-500 ml-1">/mes</span>}
        </div>
      </div>

      <ul className="space-y-2 mb-6">
        {plan.features.slice(0, 5).map((feature, index) => (
          <li key={index} className="flex items-center text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {!plan.isCurrent && (
        <button
          onClick={() => onSelect(plan.key)}
          disabled={isChanging}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            buttonClasses[colorKey]
          }`}
        >
          {isChanging ? 'Cambiando...' : 'Seleccionar Plan'}
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
      await planService.changePlan(newPlanKey);
      toast.success('Plan actualizado exitosamente');
      setShowPlanModal(false);
      
      // Recargar datos
      if (onPlanChanged) {
        onPlanChanged();
      }
      
    } catch (error: unknown) {
      let message = 'Error al cambiar el plan';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        message = axiosError.response?.data?.message || message;
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
        <div className="text-gray-500">Cargando información del plan...</div>
      </div>
    );
  }

  const currentPlan = PLAN_FEATURES[planUsage.planType];
  const isOverAppointmentLimit = planUsage.usage.appointments.current > planUsage.usage.appointments.limit && 
                                planUsage.usage.appointments.limit !== -1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CreditCard className="h-6 w-6 text-primary-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Información del Plan</h3>
            <p className="text-sm text-gray-600">
              Revisa el uso actual de tu plan y las características disponibles
            </p>
          </div>
        </div>
        <button
          onClick={openPlanModal}
          className="btn-primary flex items-center space-x-2"
        >
          <Zap className="w-4 h-4" />
          <span>Cambiar Plan</span>
        </button>
      </div>

      {/* Plan actual */}
      <div className="mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xl font-semibold text-gray-900">
                {currentPlan.name}
              </h4>
              <p className="text-sm text-gray-600">Tu plan actual</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              currentPlan.color === 'gray' ? 'bg-gray-100 text-gray-800' :
              currentPlan.color === 'blue' ? 'bg-blue-100 text-blue-800' :
              currentPlan.color === 'purple' ? 'bg-purple-100 text-purple-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {planUsage.planType}
            </div>
          </div>

          {/* Estadísticas de uso */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Citas */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Citas este mes</span>
                </div>
                <span className={`text-sm font-semibold ${
                  isOverAppointmentLimit ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {planUsage.usage.appointments.current}/{planUsage.usage.appointments.limit === -1 ? '∞' : planUsage.usage.appointments.limit}
                </span>
              </div>
              <ProgressBar 
                current={planUsage.usage.appointments.current} 
                limit={planUsage.usage.appointments.limit}
                color={isOverAppointmentLimit ? 'red' : 'primary'}
              />
              {isOverAppointmentLimit && (
                <p className="text-xs text-red-600 mt-1">Has excedido el límite de tu plan</p>
              )}
            </div>

            {/* Servicios */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Servicios activos</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {planUsage.usage.services.current}/{planUsage.usage.services.limit === -1 ? '∞' : planUsage.usage.services.limit}
                </span>
              </div>
              <ProgressBar 
                current={planUsage.usage.services.current} 
                limit={planUsage.usage.services.limit}
              />
            </div>

            {/* Usuarios */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Usuarios activos</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {planUsage.usage.users.current}/{planUsage.usage.users.limit === -1 ? '∞' : planUsage.usage.users.limit}
                </span>
              </div>
              <ProgressBar 
                current={planUsage.usage.users.current} 
                limit={planUsage.usage.users.limit}
              />
            </div>
          </div>

          {/* Estadística adicional */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-primary-900">
                Total de clientes registrados: {planUsage.usage.clients.total}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Características del plan */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Características de tu plan
        </h4>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {currentPlan.features.map((feature, index) => (
              <div key={index} className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-gray-700">{feature.name}</span>
                <div className="flex items-center">
                  {feature.included ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      {(isOverAppointmentLimit || planUsage.usage.services.percentage > 80 || planUsage.usage.users.percentage > 80) && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">
            💡 Recomendaciones
          </h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            {isOverAppointmentLimit && (
              <li>• Has excedido el límite de citas de tu plan. Considera actualizar a un plan superior.</li>
            )}
            {planUsage.usage.services.percentage > 80 && (
              <li>• Estás cerca del límite de servicios. Considera actualizar tu plan si necesitas más servicios.</li>
            )}
            {planUsage.usage.users.percentage > 80 && (
              <li>• Estás cerca del límite de usuarios. Actualiza tu plan para agregar más miembros del equipo.</li>
            )}
          </ul>
          <div className="mt-3">
            <button
              onClick={openPlanModal}
              className="text-yellow-800 hover:text-yellow-900 font-medium flex items-center space-x-1"
            >
              <span>Ver planes disponibles</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de cambio de plan */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Cambiar Plan</h2>
                  <p className="text-gray-600 mt-1">Selecciona el plan que mejor se adapte a tu negocio</p>
                </div>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {isLoadingPlans ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando planes...</p>
                </div>
              ) : availablePlans ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <p className="text-gray-600">Error al cargar los planes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Información de contacto */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          ¿Necesitas ayuda con tu plan?
        </h4>
        <p className="text-sm text-blue-800">
          Si tienes preguntas sobre las características disponibles o necesitas ayuda para elegir el plan correcto, 
          no dudes en contactarnos. Estamos aquí para ayudarte a encontrar el plan perfecto para tu negocio.
        </p>
      </div>
    </div>
  );
};

export default PlanUsageTab; 