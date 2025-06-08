import React from 'react';
import { Check, X, Zap, Crown, Rocket, Building2 } from 'lucide-react';
import { PLANS, PLAN_FEATURES, isFeatureAvailable, type PlanTier } from '../types/plans';
import { useIsMobileSimple } from '../hooks/useIsMobile';

interface PricingTableProps {
  currentPlan?: PlanTier;
  onSelectPlan: (planTier: PlanTier) => void;
}

const PricingTable: React.FC<PricingTableProps> = ({
  currentPlan,
  onSelectPlan
}) => {
  const isMobile = useIsMobileSimple();

  const getPlanIcon = (tier: PlanTier) => {
    switch (tier) {
      case 'GRATIS': return <Zap className="w-6 h-6" />;
      case 'PROFESIONAL': return <Rocket className="w-6 h-6" />;
      case 'INTELIGENTE': return <Crown className="w-6 h-6" />;
      case 'EMPRESARIAL': return <Building2 className="w-6 h-6" />;
    }
  };

  const getPlanColor = (tier: PlanTier) => {
    switch (tier) {
      case 'GRATIS': return 'blue';
      case 'PROFESIONAL': return 'purple';
      case 'INTELIGENTE': return 'amber';
      case 'EMPRESARIAL': return 'emerald';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getCoreFeatures = () => [
    'basic_appointments',
    'email_reminders', 
    'whatsapp_integration',
    'advanced_lead_scoring',
    'churn_detection',
    'schedule_optimization',
    'basic_reports',
    'advanced_analytics',
    'custom_reports',
    'remove_branding',
    'custom_branding',
    'white_label',
    'multi_branch',
    'email_support',
    'priority_support',
    'dedicated_support'
  ];

  const isCurrentPlan = (tier: PlanTier) => currentPlan === tier;

  const isUpgrade = (tier: PlanTier) => {
    if (!currentPlan) return false;
    const currentLevel = ['GRATIS', 'PROFESIONAL', 'INTELIGENTE', 'EMPRESARIAL'].indexOf(currentPlan);
    const tierLevel = ['GRATIS', 'PROFESIONAL', 'INTELIGENTE', 'EMPRESARIAL'].indexOf(tier);
    return tierLevel > currentLevel;
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        {PLANS.map((plan) => {
          const color = getPlanColor(plan.tier);
          const isCurrent = isCurrentPlan(plan.tier);
          const isUpgradeOption = isUpgrade(plan.tier);

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 shadow-sm transition-all ${
                plan.popular
                  ? 'border-purple-500 shadow-purple-100'
                  : isCurrent
                  ? 'border-green-500 shadow-green-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MÁS POPULAR
                  </span>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    PLAN ACTUAL
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${color}-100 text-${color}-600 mb-4`}>
                  {getPlanIcon(plan.tier)}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{plan.subtitle}</p>
                
                <div className="mt-4">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-gray-900">Gratis</span>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold text-gray-900">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-gray-600">/mes</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Turnos/mes:</span>
                  <span className="font-medium">
                    {plan.limits.monthlyAppointments === 'unlimited' ? 'Ilimitados' : plan.limits.monthlyAppointments}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Usuarios:</span>
                  <span className="font-medium">
                    {plan.limits.users === 'unlimited' ? 'Ilimitados' : plan.limits.users}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Clientes:</span>
                  <span className="font-medium">
                    {plan.limits.clients === 'unlimited' ? 'Ilimitados' : plan.limits.clients}
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => onSelectPlan(plan.tier)}
                disabled={isCurrent}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : plan.popular || isUpgradeOption
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isCurrent ? 'Plan Actual' : plan.ctaText}
              </button>

              {/* Target */}
              <p className="text-xs text-gray-500 text-center mt-3">
                {plan.target}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop version
  return (
    <div className="grid grid-cols-4 gap-8">
      {PLANS.map((plan) => {
        const color = getPlanColor(plan.tier);
        const isCurrent = isCurrentPlan(plan.tier);
        const isUpgradeOption = isUpgrade(plan.tier);

        return (
          <div
            key={plan.id}
            className={`relative rounded-2xl border-2 p-8 shadow-lg transition-all ${
              plan.popular
                ? 'border-purple-500 shadow-purple-100 scale-105'
                : isCurrent
                ? 'border-green-500 shadow-green-100'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-xl'
            }`}
          >
            {/* Badge */}
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                  MÁS POPULAR
                </span>
              </div>
            )}

            {isCurrent && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                  PLAN ACTUAL
                </span>
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-${color}-100 text-${color}-600 mb-4`}>
                {getPlanIcon(plan.tier)}
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-gray-600 mt-2">{plan.subtitle}</p>
              
              <div className="mt-6">
                {plan.price === 0 ? (
                  <span className="text-4xl font-bold text-gray-900">Gratis</span>
                ) : (
                  <div>
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="text-gray-600">/mes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Limits */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between">
                <span className="text-gray-600">Turnos/mes:</span>
                <span className="font-medium">
                  {plan.limits.monthlyAppointments === 'unlimited' ? 'Ilimitados' : plan.limits.monthlyAppointments}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Usuarios:</span>
                <span className="font-medium">
                  {plan.limits.users === 'unlimited' ? 'Ilimitados' : plan.limits.users}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Clientes:</span>
                <span className="font-medium">
                  {plan.limits.clients === 'unlimited' ? 'Ilimitados' : plan.limits.clients}
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-8">
              {getCoreFeatures().map((featureId) => {
                const available = isFeatureAvailable(featureId, plan.tier);
                const feature = PLAN_FEATURES.find(f => f.id === featureId);
                
                if (!feature) return null;

                return (
                  <div key={featureId} className="flex items-center space-x-3">
                    {available ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${available ? 'text-gray-900' : 'text-gray-400'}`}>
                      {feature.icon} {feature.name}
                      {feature.isAI && <span className="ml-1 text-purple-600 font-bold">AI</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* CTA Button */}
            <button
              onClick={() => onSelectPlan(plan.tier)}
              disabled={isCurrent}
              className={`w-full py-4 px-6 rounded-lg font-medium transition-colors ${
                isCurrent
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : plan.popular || isUpgradeOption
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {isCurrent ? 'Plan Actual' : plan.ctaText}
            </button>

            {/* Target */}
            <p className="text-sm text-gray-500 text-center mt-4">
              {plan.target}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default PricingTable; 