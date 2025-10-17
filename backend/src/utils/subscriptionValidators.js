/**
 * Helpers de validación para sistema de suscripciones
 * Centraliza validaciones de schema, enums y lógica de negocio
 */

// Enums válidos según schema.prisma
const VALID_SUBSCRIPTION_STATUS = ['ACTIVE', 'CANCELLED', 'SUSPENDED', 'EXPIRED', 'PAYMENT_FAILED'];
const VALID_PAYMENT_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED'];
const VALID_BILLING_CYCLES = ['MONTHLY', 'YEARLY'];
const VALID_PLAN_TYPES = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'];

// Límites de planes
const PLAN_LIMITS = {
  FREE: {
    appointments: 30,
    services: 3,
    users: 1,
    branches: 1
  },
  BASIC: {
    appointments: 100,
    services: 10,
    users: 3,
    branches: 1
  },
  PREMIUM: {
    appointments: 500,
    services: 25,
    users: 10,
    branches: 3
  },
  ENTERPRISE: {
    appointments: -1, // ilimitado
    services: -1,
    users: -1,
    branches: -1
  }
};

/**
 * Validar si un status de suscripción es válido
 */
function isValidSubscriptionStatus(status) {
  return VALID_SUBSCRIPTION_STATUS.includes(status);
}

/**
 * Validar si un status de pago es válido
 */
function isValidPaymentStatus(status) {
  return VALID_PAYMENT_STATUS.includes(status);
}

/**
 * Validar si un ciclo de facturación es válido
 */
function isValidBillingCycle(cycle) {
  return VALID_BILLING_CYCLES.includes(cycle);
}

/**
 * Validar si un tipo de plan es válido
 */
function isValidPlanType(planType) {
  return VALID_PLAN_TYPES.includes(planType);
}

/**
 * Obtener límites de un plan
 */
function getPlanLimits(planType) {
  if (!isValidPlanType(planType)) {
    throw new Error(`Plan type '${planType}' no es válido. Válidos: ${VALID_PLAN_TYPES.join(', ')}`);
  }
  return PLAN_LIMITS[planType];
}

/**
 * Validar si el uso actual excede los límites del nuevo plan
 * @returns { valid: boolean, errors: string[] }
 */
function validatePlanLimits(currentUsage, newPlanType) {
  const limits = getPlanLimits(newPlanType);
  const errors = [];

  // Validar citas
  if (limits.appointments !== -1 && currentUsage.appointments > limits.appointments) {
    errors.push(`Tienes ${currentUsage.appointments} citas, el plan ${newPlanType} permite ${limits.appointments}`);
  }

  // Validar servicios
  if (limits.services !== -1 && currentUsage.services > limits.services) {
    errors.push(`Tienes ${currentUsage.services} servicios, el plan ${newPlanType} permite ${limits.services}`);
  }

  // Validar usuarios
  if (limits.users !== -1 && currentUsage.users > limits.users) {
    errors.push(`Tienes ${currentUsage.users} usuarios, el plan ${newPlanType} permite ${limits.users}`);
  }

  // Validar sucursales
  if (limits.branches !== -1 && currentUsage.branches > limits.branches) {
    errors.push(`Tienes ${currentUsage.branches} sucursales, el plan ${newPlanType} permite ${limits.branches}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validar datos de Payment antes de crear
 */
function validatePaymentData(data) {
  const errors = [];

  if (!data.subscriptionId) {
    errors.push('subscriptionId es requerido');
  }

  if (typeof data.amount !== 'number' || data.amount < 0) {
    errors.push('amount debe ser un número positivo');
  }

  if (data.status && !isValidPaymentStatus(data.status)) {
    errors.push(`status '${data.status}' no es válido. Válidos: ${VALID_PAYMENT_STATUS.join(', ')}`);
  }

  if (data.billingCycle && !isValidBillingCycle(data.billingCycle)) {
    errors.push(`billingCycle '${data.billingCycle}' no es válido. Válidos: ${VALID_BILLING_CYCLES.join(', ')}`);
  }

  // Validar que NO se intente usar campos que no existen
  if (data.metadata) {
    errors.push('Payment no tiene campo metadata. Usar paymentMethod para info adicional');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validar datos de Subscription antes de crear/actualizar
 */
function validateSubscriptionData(data) {
  const errors = [];

  if (data.planType && !isValidPlanType(data.planType)) {
    errors.push(`planType '${data.planType}' no es válido. Válidos: ${VALID_PLAN_TYPES.join(', ')}`);
  }

  if (data.status && !isValidSubscriptionStatus(data.status)) {
    errors.push(`status '${data.status}' no es válido. Válidos: ${VALID_SUBSCRIPTION_STATUS.join(', ')}`);
  }

  if (data.billingCycle && !isValidBillingCycle(data.billingCycle)) {
    errors.push(`billingCycle '${data.billingCycle}' no es válido. Válidos: ${VALID_BILLING_CYCLES.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Obtener todos los enums válidos (útil para debugging)
 */
function getValidEnums() {
  return {
    subscriptionStatus: VALID_SUBSCRIPTION_STATUS,
    paymentStatus: VALID_PAYMENT_STATUS,
    billingCycles: VALID_BILLING_CYCLES,
    planTypes: VALID_PLAN_TYPES
  };
}

module.exports = {
  // Validators
  isValidSubscriptionStatus,
  isValidPaymentStatus,
  isValidBillingCycle,
  isValidPlanType,
  getPlanLimits,
  validatePlanLimits,
  validatePaymentData,
  validateSubscriptionData,
  
  // Constants
  VALID_SUBSCRIPTION_STATUS,
  VALID_PAYMENT_STATUS,
  VALID_BILLING_CYCLES,
  VALID_PLAN_TYPES,
  PLAN_LIMITS,
  
  // Utils
  getValidEnums
};

