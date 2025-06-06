import React from 'react';
import { CreditCard, Users, Calendar, Wrench, TrendingUp, Check, X } from 'lucide-react';
import type { PlanUsage } from '../../types';

interface PlanUsageTabProps {
  planUsage: PlanUsage | null;
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

const PlanUsageTab: React.FC<PlanUsageTabProps> = ({ planUsage }) => {
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
      <div className="flex items-center space-x-3 mb-6">
        <CreditCard className="h-6 w-6 text-primary-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Información del Plan</h3>
          <p className="text-sm text-gray-600">
            Revisa el uso actual de tu plan y las características disponibles
          </p>
        </div>
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
        </div>
      )}

      {/* Información de contacto */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          ¿Necesitas un plan diferente?
        </h4>
        <p className="text-sm text-blue-800">
          Si necesitas actualizar tu plan o tienes preguntas sobre las características disponibles, 
          no dudes en contactarnos. Estamos aquí para ayudarte a encontrar el plan perfecto para tu negocio.
        </p>
      </div>
    </div>
  );
};

export default PlanUsageTab; 