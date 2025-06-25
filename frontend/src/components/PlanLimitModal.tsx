import React from 'react';
import { X, Crown, ArrowRight, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  currentUsers: number;
  maxUsers: number;
  nextPlan: string;
  nextPlanUsers: number;
  feature: 'users' | 'services' | 'appointments';
}

const PlanLimitModal: React.FC<PlanLimitModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  currentUsers,
  maxUsers,
  nextPlan,
  nextPlanUsers,
  feature = 'users'
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const featureConfig = {
    users: {
      icon: <Users className="w-8 h-8 text-purple-600" />,
      title: 'No puedes crear más usuarios',
      description: 'Has alcanzado el límite de usuarios de tu plan actual',
      current: `${currentUsers}/${maxUsers} usuarios`,
      next: `Hasta ${nextPlanUsers} usuarios`
    },
    services: {
      icon: <Zap className="w-8 h-8 text-blue-600" />,
      title: 'No puedes crear más servicios',
      description: 'Has alcanzado el límite de servicios de tu plan actual',
      current: `${currentUsers}/${maxUsers} servicios`,
      next: `Hasta ${nextPlanUsers} servicios`
    },
    appointments: {
      icon: <Crown className="w-8 h-8 text-amber-600" />,
      title: 'No puedes crear más citas',
      description: 'Has alcanzado el límite de citas de tu plan actual',
      current: `${currentUsers}/${maxUsers} citas/mes`,
      next: `Hasta ${nextPlanUsers} citas/mes`
    }
  };

  const config = featureConfig[feature];

  const handleUpgrade = () => {
    navigate('/dashboard/settings?tab=plan');
    onClose();
  };

  const getPlanName = (plan: string) => {
    const names = {
      'FREE': 'Gratuito',
      'BASIC': 'Básico',
      'PREMIUM': 'Premium',
      'ENTERPRISE': 'Empresarial'
    };
    return names[plan as keyof typeof names] || plan;
  };

  const getPlanPrice = (plan: string) => {
    const prices = {
      'FREE': 'Gratis',
      'BASIC': '$4.900/mes',
      'PREMIUM': '$9.900/mes',
      'ENTERPRISE': '$14.900/mes'
    };
    return prices[plan as keyof typeof prices] || '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {config.icon}
            <h2 className="text-xl font-semibold text-gray-900">
              Límite Alcanzado
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {config.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {config.description}
            </p>
          </div>

          {/* Current vs Next Plan */}
          <div className="space-y-4 mb-6">
            {/* Current Plan */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Plan {getPlanName(currentPlan)}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {config.current}
                  </p>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {getPlanPrice(currentPlan)}
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* Next Plan */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-purple-900">
                    Plan {getPlanName(nextPlan)}
                  </h4>
                  <p className="text-sm text-purple-700">
                    {config.next}
                  </p>
                </div>
                <div className="text-sm font-medium text-purple-900">
                  {getPlanPrice(nextPlan)}
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">
              ✨ Al actualizar obtienes:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Más {feature === 'users' ? 'usuarios/empleados' : feature === 'services' ? 'servicios' : 'citas por mes'}</li>
              <li>• Funciones avanzadas</li>
              <li>• Soporte prioritario</li>
              <li>• Sin interrupciones en tu negocio</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Crown className="w-4 h-4" />
              <span>Actualizar a Plan {getPlanName(nextPlan)}</span>
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanLimitModal; 