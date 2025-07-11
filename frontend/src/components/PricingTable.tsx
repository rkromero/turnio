import React, { useState } from 'react';
import { Check, X, Zap, Crown, Rocket, Building2, Star, Sparkles } from 'lucide-react';
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const getPlanIcon = (tier: PlanTier) => {
    switch (tier) {
      case 'GRATIS': return <Zap className="w-8 h-8" />;
      case 'PROFESIONAL': return <Rocket className="w-8 h-8" />;
      case 'INTELIGENTE': return <Crown className="w-8 h-8" />;
      case 'EMPRESARIAL': return <Building2 className="w-8 h-8" />;
    }
  };

  const getPlanGradient = (tier: PlanTier) => {
    switch (tier) {
      case 'GRATIS': return 'from-blue-500 to-blue-600';
      case 'PROFESIONAL': return 'from-purple-500 to-purple-600';
      case 'INTELIGENTE': return 'from-amber-500 to-orange-600';
      case 'EMPRESARIAL': return 'from-emerald-500 to-green-600';
    }
  };



  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getYearlyPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * 0.8); // 20% discount
  };

  const getDiscountAmount = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * 0.2);
  };

  const getPlanBadge = (tier: PlanTier, isPopular: boolean) => {
    if (isCurrentPlan(tier)) {
      return (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
            <Check className="w-3 h-3" />
            PLAN ACTUAL
          </div>
        </div>
      );
    }

    if (isPopular) {
      return (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
            <Star className="w-3 h-3" />
            MÁS ELEGIDO
          </div>
        </div>
      );
    }

    if (tier === 'INTELIGENTE') {
      return (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            CON IA
          </div>
        </div>
      );
    }

    return null;
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

  const getButtonText = (tier: PlanTier) => {
    if (isCurrentPlan(tier)) return 'Tu Plan Actual';
    if (isUpgrade(tier)) return '🚀 Mejorar Plan';
    return tier === 'GRATIS' ? 'Empezar Gratis' : 'Elegir Plan';
  };

  const getButtonStyle = (tier: PlanTier) => {
    if (isCurrentPlan(tier)) {
      return 'bg-gray-100 text-gray-500 cursor-not-allowed border-2 border-gray-200';
    }
    
    if (tier === 'PROFESIONAL' || isUpgrade(tier)) {
      return 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-purple-600';
    }
    
    if (tier === 'INTELIGENTE') {
      return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-amber-500';
    }
    
    if (tier === 'EMPRESARIAL') {
      return 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-emerald-500';
    }
    
    return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-blue-500';
  };

  if (isMobile) {
    return (
      <div className="space-y-6">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-xl">
            <div className="flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === 'monthly' 
                    ? 'bg-white text-gray-900 shadow-md' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  billingCycle === 'yearly' 
                    ? 'bg-white text-gray-900 shadow-md' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Anual
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  -20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {PLANS.map((plan) => {
          const isCurrent = isCurrentPlan(plan.tier);
          const currentPrice = billingCycle === 'yearly' ? getYearlyPrice(plan.price) : plan.price;
          const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(currentPrice / 12) : plan.price;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border-2 p-8 shadow-lg transition-all duration-300 hover:shadow-2xl ${
                plan.popular
                  ? 'border-purple-500 shadow-purple-100 bg-gradient-to-b from-purple-50 to-white'
                  : isCurrent
                  ? 'border-green-500 shadow-green-100 bg-gradient-to-b from-green-50 to-white'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {getPlanBadge(plan.tier, plan.popular || false)}

              {/* Header */}
              <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${getPlanGradient(plan.tier)} text-white mb-4 shadow-lg`}>
                  {getPlanIcon(plan.tier)}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.subtitle}</p>
                
                <div className="mb-6">
                  {plan.price === 0 ? (
                    <div className="text-center">
                      <span className="text-4xl font-bold text-gray-900">Gratis</span>
                      <p className="text-sm text-gray-600 mt-1">Para siempre</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      {billingCycle === 'yearly' && (
                        <div className="text-sm text-gray-500 line-through mb-1">
                          {formatPrice(plan.price * 12)}
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-4xl font-bold text-gray-900">
                          {billingCycle === 'yearly' ? formatPrice(monthlyEquivalent) : formatPrice(plan.price)}
                        </span>
                        <span className="text-gray-600">/mes</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <div className="text-sm text-green-600 font-semibold mt-1">
                          Ahorrás {formatPrice(getDiscountAmount(plan.price))} al año
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Key Features */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <span className="text-gray-700 font-medium">Turnos/mes</span>
                  <span className="font-bold text-gray-900">
                    {plan.limits.monthlyAppointments === 'unlimited' ? '∞' : plan.limits.monthlyAppointments}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <span className="text-gray-700 font-medium">Usuarios</span>
                  <span className="font-bold text-gray-900">
                    {plan.limits.users === 'unlimited' ? '∞' : plan.limits.users}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <span className="text-gray-700 font-medium">Clientes</span>
                  <span className="font-bold text-gray-900">
                    {plan.limits.clients === 'unlimited' ? '∞' : plan.limits.clients}
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => onSelectPlan(plan.tier)}
                disabled={isCurrent}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${getButtonStyle(plan.tier)}`}
              >
                {getButtonText(plan.tier)}
              </button>

              {/* Target */}
              <p className="text-sm text-gray-500 text-center mt-4 italic">
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
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-xl">
          <div className="flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-8 py-3 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'monthly' 
                  ? 'bg-white text-gray-900 shadow-md' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Facturación Mensual
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-8 py-3 rounded-lg text-sm font-medium transition-all relative ${
                billingCycle === 'yearly' 
                  ? 'bg-white text-gray-900 shadow-md' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Facturación Anual
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                -20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-4 gap-8">
        {PLANS.map((plan) => {
          const isCurrent = isCurrentPlan(plan.tier);
          const currentPrice = billingCycle === 'yearly' ? getYearlyPrice(plan.price) : plan.price;
          const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(currentPrice / 12) : plan.price;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border-2 p-8 shadow-lg transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1 ${
                plan.popular
                  ? 'border-purple-500 shadow-purple-100 bg-gradient-to-b from-purple-50 to-white scale-105'
                  : isCurrent
                  ? 'border-green-500 shadow-green-100 bg-gradient-to-b from-green-50 to-white'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              style={{ minHeight: '650px' }}
            >
              {getPlanBadge(plan.tier, plan.popular || false)}

              {/* Header */}
              <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r ${getPlanGradient(plan.tier)} text-white mb-6 shadow-lg`}>
                  {getPlanIcon(plan.tier)}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.subtitle}</p>
                
                <div className="mb-8">
                  {plan.price === 0 ? (
                    <div className="text-center">
                      <span className="text-5xl font-bold text-gray-900">Gratis</span>
                      <p className="text-sm text-gray-600 mt-2">Para siempre</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      {billingCycle === 'yearly' && (
                        <div className="text-lg text-gray-500 line-through mb-2">
                          {formatPrice(plan.price * 12)}
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-5xl font-bold text-gray-900">
                          {billingCycle === 'yearly' ? formatPrice(monthlyEquivalent) : formatPrice(plan.price)}
                        </span>
                        <span className="text-gray-600">/mes</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <div className="text-sm text-green-600 font-semibold mt-2">
                          Ahorrás {formatPrice(getDiscountAmount(plan.price))} al año
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Key Features */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <span className="text-gray-700 font-medium">Turnos/mes</span>
                  <span className="font-bold text-gray-900">
                    {plan.limits.monthlyAppointments === 'unlimited' ? '∞' : plan.limits.monthlyAppointments}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <span className="text-gray-700 font-medium">Usuarios</span>
                  <span className="font-bold text-gray-900">
                    {plan.limits.users === 'unlimited' ? '∞' : plan.limits.users}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <span className="text-gray-700 font-medium">Clientes</span>
                  <span className="font-bold text-gray-900">
                    {plan.limits.clients === 'unlimited' ? '∞' : plan.limits.clients}
                  </span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8 flex-grow">
                {getCoreFeatures().slice(0, 6).map((featureId) => {
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
                        {feature.name}
                        {feature.isAI && <span className="ml-1 text-purple-600 font-bold">AI</span>}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* CTA Button */}
              <div className="absolute bottom-8 left-8 right-8">
                <button
                  onClick={() => onSelectPlan(plan.tier)}
                  disabled={isCurrent}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${getButtonStyle(plan.tier)}`}
                >
                  {getButtonText(plan.tier)}
                </button>

                {/* Target */}
                <p className="text-sm text-gray-500 text-center mt-4 italic">
                  {plan.target}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingTable; 