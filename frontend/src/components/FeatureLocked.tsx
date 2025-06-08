import React from 'react';
import { Lock, Crown, ArrowUp, Sparkles } from 'lucide-react';
import { PlanTier, PLAN_FEATURES } from '../types/plans';

interface FeatureLockedProps {
  featureId: string;
  onUpgrade: (targetPlan: PlanTier) => void;
  showAsOverlay?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const FeatureLocked: React.FC<FeatureLockedProps> = ({
  featureId,
  onUpgrade,
  showAsOverlay = false,
  size = 'md'
}) => {
  const feature = PLAN_FEATURES.find(f => f.id === featureId);
  
  if (!feature) {
    return null;
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return {
        container: 'p-3',
        icon: 'w-4 h-4',
        title: 'text-sm font-medium',
        description: 'text-xs',
        button: 'px-2 py-1 text-xs'
      };
      case 'lg': return {
        container: 'p-8',
        icon: 'w-8 h-8',
        title: 'text-xl font-bold',
        description: 'text-base',
        button: 'px-6 py-3 text-base'
      };
      default: return {
        container: 'p-6',
        icon: 'w-6 h-6',
        title: 'text-lg font-semibold',
        description: 'text-sm',
        button: 'px-4 py-2 text-sm'
      };
    }
  };

  const classes = getSizeClasses();

  const getPlanColor = (tier: PlanTier) => {
    switch (tier) {
      case 'GRATIS': return 'blue';
      case 'PROFESIONAL': return 'purple';
      case 'INTELIGENTE': return 'amber';
      case 'EMPRESARIAL': return 'emerald';
    }
  };

  const planColor = getPlanColor(feature.requiredPlan);

  const containerClasses = showAsOverlay
    ? `absolute inset-0 bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg`
    : `relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg ${classes.container}`;

  return (
    <div className={containerClasses}>
      <div className="text-center">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4`}>
          <Lock className={`${classes.icon} text-gray-500`} />
        </div>

        {/* Feature info */}
        <div className="mb-4">
          <h3 className={`${classes.title} text-gray-900 mb-2`}>
            {feature.icon} {feature.name}
            {feature.isAI && (
              <Sparkles className="inline w-4 h-4 ml-1 text-purple-500" />
            )}
          </h3>
          <p className={`${classes.description} text-gray-600 mb-3`}>
            {feature.description}
          </p>
          
          {feature.isAI && (
            <div className="inline-flex items-center space-x-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium mb-3">
              <Sparkles className="w-3 h-3" />
              <span>IA Avanzada</span>
            </div>
          )}

          <div className={`inline-flex items-center space-x-1 bg-${planColor}-100 text-${planColor}-700 px-2 py-1 rounded-full text-xs font-medium`}>
            <Crown className="w-3 h-3" />
            <span>Requiere {feature.requiredPlan}</span>
          </div>
        </div>

        {/* Upgrade button */}
        <button
          onClick={() => onUpgrade(feature.requiredPlan)}
          className={`inline-flex items-center space-x-2 bg-purple-600 text-white hover:bg-purple-700 transition-colors rounded-lg font-medium ${classes.button}`}
        >
          <Crown className="w-4 h-4" />
          <span>Actualizar Plan</span>
          <ArrowUp className="w-4 h-4" />
        </button>

        <p className="text-xs text-gray-500 mt-2">
          Desbloquea esta funcionalidad actualizando tu plan
        </p>
      </div>
    </div>
  );
};

export default FeatureLocked; 