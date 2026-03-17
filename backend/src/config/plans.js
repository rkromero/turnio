/**
 * Definición canónica de planes de Turnio.
 * ÚNICA fuente de verdad para precios, límites y features.
 * Importar desde acá en todos los controllers y services.
 */

const AVAILABLE_PLANS = {
  FREE: {
    name: 'Plan Gratuito',
    description: 'Perfecto para empezar',
    price: 0,
    limits: {
      appointments: 30,
      services: 3,
      users: 1
    },
    features: [
      'Hasta 30 citas por mes',
      'Hasta 3 servicios',
      '1 usuario/empleado',
      'Reservas públicas',
      'Dashboard básico'
    ]
  },
  BASIC: {
    name: 'Plan Básico',
    description: 'Ideal para profesionales individuales',
    price: 18900,
    limits: {
      appointments: 100,
      services: 10,
      users: 3
    },
    features: [
      'Hasta 100 citas por mes',
      'Hasta 10 servicios',
      'Hasta 3 usuarios/empleados',
      'Reservas públicas',
      'Dashboard completo',
      'Recordatorios por email',
      'Reportes básicos'
    ]
  },
  PREMIUM: {
    name: 'Plan Premium',
    description: 'Para equipos y consultorios',
    price: 24900,
    limits: {
      appointments: 500,
      services: 25,
      users: 10
    },
    features: [
      'Hasta 500 citas por mes',
      'Hasta 25 servicios',
      'Hasta 10 usuarios/empleados',
      'Reservas públicas',
      'Dashboard avanzado',
      'Recordatorios por email y SMS',
      'Reportes avanzados',
      'Personalización de marca'
    ]
  },
  ENTERPRISE: {
    name: 'Plan Empresa',
    description: 'Para empresas y clínicas',
    price: 90900,
    limits: {
      appointments: -1, // Ilimitado
      services: -1,     // Ilimitado
      users: -1         // Ilimitado
    },
    features: [
      'Citas ilimitadas',
      'Servicios ilimitados',
      'Usuarios/empleados ilimitados',
      'Reservas públicas',
      'Dashboard avanzado',
      'Recordatorios por email y SMS',
      'Reportes completos',
      'Personalización completa de marca',
      'Soporte prioritario 24/7'
    ]
  }
};

// Orden jerárquico de planes (de menor a mayor)
const PLAN_HIERARCHY = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'];

// Mapa de precios plano, para uso rápido en servicios de pago
const PLAN_PRICES = Object.fromEntries(
  Object.entries(AVAILABLE_PLANS).map(([key, plan]) => [key, plan.price])
);

module.exports = {
  AVAILABLE_PLANS,
  PLAN_HIERARCHY,
  PLAN_PRICES
};
