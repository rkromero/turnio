export type PlanTier = 'GRATIS' | 'PROFESIONAL' | 'INTELIGENTE' | 'EMPRESARIAL';

export interface PlanLimits {
  monthlyAppointments: number | 'unlimited';
  users: number | 'unlimited';
  clients: number | 'unlimited';
  reports: number | 'unlimited';
  apiCalls?: number | 'unlimited';
  whatsappMessages?: number | 'unlimited';
  smsMessages?: number | 'unlimited';
  emailMessages?: number | 'unlimited';
  branches?: number | 'unlimited';
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'automation' | 'ai' | 'integration' | 'support' | 'customization' | 'analytics';
  requiredPlan: PlanTier;
  isAI?: boolean;
  isNew?: boolean;
  comingSoon?: boolean;
  icon?: string;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  subtitle: string;
  price: number;
  currency: 'ARS';
  billingCycle: 'monthly' | 'yearly';
  limits: PlanLimits;
  features: string[]; // Array of feature IDs
  popular?: boolean;
  target: string;
  savings?: number; // Percentage saved if yearly
  ctaText: string;
  ctaAction: 'start_trial' | 'upgrade' | 'contact_sales' | 'current_plan';
}

export interface UserPlanUsage {
  currentPlan: PlanTier;
  usage: {
    monthlyAppointments: number;
    users: number;
    clients: number;
    reportsGenerated: number;
    apiCalls?: number;
    whatsappMessages?: number;
    smsMessages?: number;
    emailMessages?: number;
    branches?: number;
  };
  billingCycle: Date;
  isTrialing?: boolean;
  trialEndsAt?: Date;
  nextBillingDate?: Date;
}

// Feature Categories for organization
export const FEATURE_CATEGORIES = {
  core: {
    name: 'Funcionalidades Básicas',
    icon: '⚡',
    color: 'blue'
  },
  automation: {
    name: 'Automatización',
    icon: '🤖',
    color: 'green'
  },
  ai: {
    name: 'Inteligencia Artificial',
    icon: '🧠',
    color: 'purple'
  },
  integration: {
    name: 'Integraciones',
    icon: '🔗',
    color: 'indigo'
  },
  support: {
    name: 'Soporte',
    icon: '💬',
    color: 'yellow'
  },
  customization: {
    name: 'Personalización',
    icon: '🎨',
    color: 'pink'
  },
  analytics: {
    name: 'Reportes & Analytics',
    icon: '📊',
    color: 'emerald'
  }
} as const;

// Plan hierarchy for upgrade logic
export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  GRATIS: 0,
  PROFESIONAL: 1,
  INTELIGENTE: 2,
  EMPRESARIAL: 3
};

export interface UpgradeIncentive {
  featureId: string;
  title: string;
  description: string;
  actionText: string;
  targetPlan: PlanTier;
  urgency: 'low' | 'medium' | 'high';
  benefit: string; // What they get by upgrading
}

export interface UsageLimitWarning {
  type: 'appointments' | 'users' | 'clients' | 'reports' | 'whatsapp' | 'sms' | 'email';
  current: number;
  limit: number | 'unlimited';
  percentage: number;
  severity: 'warning' | 'critical' | 'exceeded';
  message: string;
  actionRequired: boolean;
  upgradeMessage?: string;
  targetPlan?: PlanTier;
}

// All available features in the system
export const PLAN_FEATURES: PlanFeature[] = [
  // CORE FEATURES
  {
    id: 'basic_appointments',
    name: 'Gestión de Turnos',
    description: 'Crear, editar y gestionar citas básicas',
    category: 'core',
    requiredPlan: 'GRATIS',
    icon: '📅'
  },
  {
    id: 'calendar_view',
    name: 'Vista Calendario',
    description: 'Visualización mensual de turnos',
    category: 'core',
    requiredPlan: 'GRATIS',
    icon: '🗓️'
  },
  {
    id: 'client_management',
    name: 'Gestión de Clientes',
    description: 'Base de datos de clientes con historial',
    category: 'core',
    requiredPlan: 'GRATIS',
    icon: '👥'
  },
  {
    id: 'service_management',
    name: 'Gestión de Servicios',
    description: 'Configuración de servicios y precios',
    category: 'core',
    requiredPlan: 'GRATIS',
    icon: '✂️'
  },

  // AUTOMATION FEATURES
  {
    id: 'email_reminders',
    name: 'Recordatorios por Email',
    description: 'Envío automático de recordatorios por email',
    category: 'automation',
    requiredPlan: 'PROFESIONAL',
    icon: '📧'
  },
  {
    id: 'whatsapp_integration',
    name: 'Integración WhatsApp',
    description: 'Recordatorios y notificaciones por WhatsApp',
    category: 'integration',
    requiredPlan: 'INTELIGENTE',
    icon: '💬'
  },
  {
    id: 'sms_notifications',
    name: 'Notificaciones SMS',
    description: 'Recordatorios por SMS',
    category: 'integration',
    requiredPlan: 'INTELIGENTE',
    icon: '📱'
  },

  // AI FEATURES
  {
    id: 'basic_client_scoring',
    name: 'Scoring Básico de Clientes',
    description: 'Puntuación simple basada en historial',
    category: 'ai',
    requiredPlan: 'PROFESIONAL',
    icon: '⭐',
    isAI: true
  },
  {
    id: 'advanced_lead_scoring',
    name: 'Lead Scoring Avanzado',
    description: 'IA para identificar clientes de alto valor',
    category: 'ai',
    requiredPlan: 'INTELIGENTE',
    icon: '🎯',
    isAI: true
  },
  {
    id: 'churn_detection',
    name: 'Detección de Abandono',
    description: 'IA que predice clientes en riesgo de abandonar',
    category: 'ai',
    requiredPlan: 'INTELIGENTE',
    icon: '🚨',
    isAI: true
  },
  {
    id: 'schedule_optimization',
    name: 'Optimización de Horarios',
    description: 'IA que sugiere los mejores horarios disponibles',
    category: 'ai',
    requiredPlan: 'EMPRESARIAL',
    icon: '🧠',
    isAI: true
  },
  {
    id: 'demand_prediction',
    name: 'Predicción de Demanda',
    description: 'IA que predice picos de demanda y optimiza recursos',
    category: 'ai',
    requiredPlan: 'EMPRESARIAL',
    icon: '📈',
    isAI: true
  },

  // ANALYTICS & REPORTS
  {
    id: 'basic_reports',
    name: 'Reportes Básicos',
    description: 'Estadísticas simples de turnos y clientes',
    category: 'analytics',
    requiredPlan: 'PROFESIONAL',
    icon: '📊'
  },
  {
    id: 'advanced_analytics',
    name: 'Analytics Avanzados',
    description: 'Dashboards completos con métricas de negocio',
    category: 'analytics',
    requiredPlan: 'INTELIGENTE',
    icon: '📈'
  },
  {
    id: 'custom_reports',
    name: 'Reportes Personalizados',
    description: 'Crear reportes específicos para el negocio',
    category: 'analytics',
    requiredPlan: 'EMPRESARIAL',
    icon: '📋'
  },

  // CUSTOMIZATION
  {
    id: 'remove_branding',
    name: 'Sin Marca Turnio',
    description: 'Eliminar "Powered by Turnio"',
    category: 'customization',
    requiredPlan: 'PROFESIONAL',
    icon: '🏷️'
  },
  {
    id: 'custom_branding',
    name: 'Personalización Visual',
    description: 'Colores, logos y personalización de marca',
    category: 'customization',
    requiredPlan: 'INTELIGENTE',
    icon: '🎨'
  },
  {
    id: 'white_label',
    name: 'White Label Completo',
    description: 'Marca completamente personalizada',
    category: 'customization',
    requiredPlan: 'EMPRESARIAL',
    icon: '🏢'
  },

  // SUPPORT
  {
    id: 'documentation_support',
    name: 'Soporte por Documentación',
    description: 'Acceso a guías y documentación',
    category: 'support',
    requiredPlan: 'GRATIS',
    icon: '📚'
  },
  {
    id: 'email_support',
    name: 'Soporte por Email',
    description: 'Respuesta en 24-48 horas',
    category: 'support',
    requiredPlan: 'PROFESIONAL',
    icon: '📧'
  },
  {
    id: 'priority_support',
    name: 'Soporte Prioritario',
    description: 'Respuesta en 2-4 horas',
    category: 'support',
    requiredPlan: 'INTELIGENTE',
    icon: '⚡'
  },
  {
    id: 'dedicated_support',
    name: 'Soporte Dedicado',
    description: 'Línea telefónica + onboarding personalizado',
    category: 'support',
    requiredPlan: 'EMPRESARIAL',
    icon: '☎️'
  },

  // ENTERPRISE FEATURES
  {
    id: 'multi_branch',
    name: 'Multi-Sucursal',
    description: 'Gestión de múltiples ubicaciones',
    category: 'core',
    requiredPlan: 'EMPRESARIAL',
    icon: '🏢'
  },
  {
    id: 'api_access',
    name: 'Acceso API',
    description: 'Integración con sistemas externos',
    category: 'integration',
    requiredPlan: 'EMPRESARIAL',
    icon: '🔌'
  }
];

// Plan definitions
export const PLANS: Plan[] = [
  {
    id: 'gratis',
    tier: 'GRATIS',
    name: 'Gratis',
    subtitle: 'Perfecto para empezar',
    price: 0,
    currency: 'ARS',
    billingCycle: 'monthly',
    limits: {
      monthlyAppointments: 30,
      users: 1,
      clients: 50,
      reports: 0,
      emailMessages: 0,
      whatsappMessages: 0,
      smsMessages: 0
    },
    features: [
      'basic_appointments',
      'calendar_view', 
      'client_management',
      'service_management',
      'documentation_support'
    ],
    target: 'Barberos independientes, prueba del producto',
    ctaText: 'Comenzar Gratis',
    ctaAction: 'start_trial'
  },
  {
    id: 'profesional',
    tier: 'PROFESIONAL',
    name: 'Profesional',
    subtitle: 'Ideal para salones establecidos',
    price: 8900,
    currency: 'ARS',
    billingCycle: 'monthly',
    limits: {
      monthlyAppointments: 300,
      users: 3,
      clients: 1000,
      reports: 5,
      emailMessages: 500,
      whatsappMessages: 0,
      smsMessages: 0
    },
    features: [
      'basic_appointments',
      'calendar_view',
      'client_management', 
      'service_management',
      'email_reminders',
      'basic_client_scoring',
      'basic_reports',
      'remove_branding',
      'email_support'
    ],
    popular: true,
    target: 'Salones establecidos, múltiples profesionales',
    ctaText: 'Comenzar Prueba',
    ctaAction: 'start_trial'
  },
  {
    id: 'inteligente',
    tier: 'INTELIGENTE', 
    name: 'Inteligente',
    subtitle: 'Con IA para salones premium',
    price: 17900,
    currency: 'ARS',
    billingCycle: 'monthly',
    limits: {
      monthlyAppointments: 1000,
      users: 8,
      clients: 5000,
      reports: 'unlimited',
      emailMessages: 2000,
      whatsappMessages: 500,
      smsMessages: 200
    },
    features: [
      'basic_appointments',
      'calendar_view',
      'client_management',
      'service_management', 
      'email_reminders',
      'whatsapp_integration',
      'sms_notifications',
      'basic_client_scoring',
      'advanced_lead_scoring',
      'churn_detection',
      'basic_reports',
      'advanced_analytics',
      'remove_branding',
      'custom_branding',
      'priority_support'
    ],
    target: 'Salones premium, cadenas pequeñas',
    ctaText: 'Comenzar Prueba',
    ctaAction: 'start_trial'
  },
  {
    id: 'empresarial',
    tier: 'EMPRESARIAL',
    name: 'Empresarial', 
    subtitle: 'Sin límites para cadenas',
    price: 34900,
    currency: 'ARS',
    billingCycle: 'monthly',
    limits: {
      monthlyAppointments: 'unlimited',
      users: 'unlimited', 
      clients: 'unlimited',
      reports: 'unlimited',
      emailMessages: 'unlimited',
      whatsappMessages: 'unlimited',
      smsMessages: 'unlimited',
      branches: 'unlimited',
      apiCalls: 'unlimited'
    },
    features: [
      'basic_appointments',
      'calendar_view',
      'client_management',
      'service_management',
      'email_reminders', 
      'whatsapp_integration',
      'sms_notifications',
      'basic_client_scoring',
      'advanced_lead_scoring',
      'churn_detection',
      'schedule_optimization',
      'demand_prediction',
      'basic_reports',
      'advanced_analytics',
      'custom_reports',
      'remove_branding',
      'white_label',
      'multi_branch',
      'api_access',
      'dedicated_support'
    ],
    target: 'Cadenas, franquicias, múltiples sucursales',
    ctaText: 'Contactar Ventas',
    ctaAction: 'contact_sales'
  }
];

// Utility functions
export const getPlanByTier = (tier: PlanTier): Plan | undefined => {
  return PLANS.find(plan => plan.tier === tier);
};

export const getFeaturesByPlan = (tier: PlanTier): PlanFeature[] => {
  const plan = getPlanByTier(tier);
  if (!plan) return [];
  
  return PLAN_FEATURES.filter(feature => 
    plan.features.includes(feature.id)
  );
};

export const isFeatureAvailable = (featureId: string, userPlan: PlanTier): boolean => {
  const feature = PLAN_FEATURES.find(f => f.id === featureId);
  if (!feature) return false;
  
  const userPlanLevel = PLAN_HIERARCHY[userPlan];
  const requiredPlanLevel = PLAN_HIERARCHY[feature.requiredPlan];
  
  return userPlanLevel >= requiredPlanLevel;
};

export const getUpgradeIncentives = (currentPlan: PlanTier): UpgradeIncentive[] => {
  const currentLevel = PLAN_HIERARCHY[currentPlan];
  const availableFeatures = PLAN_FEATURES.filter(feature => {
    const requiredLevel = PLAN_HIERARCHY[feature.requiredPlan];
    return requiredLevel > currentLevel;
  });

  return availableFeatures.slice(0, 3).map(feature => ({
    featureId: feature.id,
    title: `Desbloquea ${feature.name}`,
    description: feature.description,
    actionText: `Upgrade a ${feature.requiredPlan}`,
    targetPlan: feature.requiredPlan,
    urgency: feature.isAI ? 'high' : 'medium',
    benefit: feature.isAI ? 'Automatización inteligente' : 'Funcionalidad avanzada'
  }));
};

export const calculateUsageWarnings = (usage: UserPlanUsage): UsageLimitWarning[] => {
  const plan = getPlanByTier(usage.currentPlan);
  if (!plan) return [];
  
  const warnings: UsageLimitWarning[] = [];
  
  // Check appointments usage
  if (plan.limits.monthlyAppointments !== 'unlimited') {
    const percentage = (usage.usage.monthlyAppointments / plan.limits.monthlyAppointments) * 100;
    if (percentage >= 80) {
      warnings.push({
        type: 'appointments',
        current: usage.usage.monthlyAppointments,
        limit: plan.limits.monthlyAppointments,
        percentage,
        severity: percentage >= 100 ? 'exceeded' : percentage >= 95 ? 'critical' : 'warning',
        message: `Has usado ${usage.usage.monthlyAppointments} de ${plan.limits.monthlyAppointments} turnos este mes`,
        actionRequired: percentage >= 95,
        upgradeMessage: 'Considera actualizar tu plan para más turnos',
        targetPlan: getNextPlan(usage.currentPlan)
      });
    }
  }
  
  return warnings;
};

export const getNextPlan = (currentPlan: PlanTier): PlanTier | null => {
  const currentLevel = PLAN_HIERARCHY[currentPlan];
  const nextPlan = Object.entries(PLAN_HIERARCHY)
    .find(([, level]) => level === currentLevel + 1);
  
  return nextPlan ? nextPlan[0] as PlanTier : null;
}; 