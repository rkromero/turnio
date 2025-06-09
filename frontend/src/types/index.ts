export interface Business {
  id: string;
  name: string;
  email: string;
  slug: string;
  planType: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  maxAppointments: number;
  logo?: string;
  phone?: string;
  address?: string;
  description?: string;
  primaryColor?: string;
  businessType?: BusinessType;
  defaultAppointmentDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  businessId: string;
  branchId?: string; // Sucursal específica del usuario
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
  avatar?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  business?: Business;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  duration: number; // en minutos
  price: number;
  isActive: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  businessId: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  businessId: string;
  clientId: string;
  serviceId: string;
  userId?: string; // profesional asignado
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  notes?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Relaciones
  client?: Client;
  service?: Service;
  user?: User;
}

export interface WorkingHours {
  id: string;
  userId: string;
  dayOfWeek: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  startTime: string; // HH:MM formato
  endTime: string; // HH:MM formato
  isActive: boolean;
}

// Horarios de descanso por sucursal
export interface BranchBreakTime {
  id: string;
  branchId: string;
  dayOfWeek: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  startTime: string; // HH:MM formato
  endTime: string; // HH:MM formato
  name?: string; // Ej: "Almuerzo", "Pausa de la tarde"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchBreakTimeForm {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  name?: string;
  isActive?: boolean;
}

export interface AvailableSlot {
  time: string;
  userId: string;
  userName: string;
}

export interface BookingData {
  business: {
    id: string;
    name: string;
    slug: string;
  };
  services: Service[];
  availableSlots: AvailableSlot[];
}

// Tipos para formularios
export interface RegisterForm {
  businessName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  description?: string;
  businessType?: BusinessType;
  defaultAppointmentDuration?: number;
}

// Enum para tipos de negocio
export enum BusinessType {
  GENERAL = 'GENERAL',
  BARBERSHOP = 'BARBERSHOP',
  HAIR_SALON = 'HAIR_SALON', 
  BEAUTY_CENTER = 'BEAUTY_CENTER',
  MEDICAL_CENTER = 'MEDICAL_CENTER',
  MASSAGE_SPA = 'MASSAGE_SPA'
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface AppointmentForm {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceId: string;
  userId?: string;
  startTime: string;
  notes?: string;
  status?: 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
}

export interface ServiceForm {
  name: string;
  description?: string;
  duration: number;
  price: number;
  color?: string;
  isGlobal?: boolean; // Si está disponible en todas las sucursales
  branchIds?: string[]; // Sucursales específicas (para servicios no globales)
}

// Tipos para respuestas de API
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

export interface AuthResponse {
  user: User;
  business: Business;
}

// Tipos para contexto de autenticación
export interface AuthContextType {
  user: User | null;
  business: Business | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterForm) => Promise<void>;
  logout: () => void;
}

// Configuración del negocio
export interface BusinessConfig {
  id: string;
  name: string;
  email: string;
  slug: string;
  planType: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  maxAppointments: number;
  logo?: string;
  phone?: string;
  address?: string;
  description?: string;
  primaryColor?: string;
  businessType?: BusinessType;
  defaultAppointmentDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessConfigForm {
  name?: string;
  phone?: string;
  address?: string;
  description?: string;
  primaryColor?: string;
  logo?: string;
  businessType?: BusinessType;
  defaultAppointmentDuration?: number;
}

// Horarios de trabajo
export interface WorkingHours {
  id: string;
  userId: string;
  dayOfWeek: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  startTime: string; // HH:MM formato
  endTime: string; // HH:MM formato
  isActive: boolean;
}

export interface WorkingHoursForm {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface UserWithWorkingHours extends User {
  workingHours: WorkingHours[];
}

// Feriados
export interface Holiday {
  id: string;
  businessId: string;
  name: string;
  date: string;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayForm {
  name: string;
  date: string;
  isRecurring?: boolean;
}

// Estadísticas de uso del plan
export interface PlanUsage {
  planType: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  usage: {
    appointments: {
      current: number;
      limit: number;
      percentage: number;
    };
    services: {
      current: number;
      limit: number;
      percentage: number;
    };
    users: {
      current: number;
      limit: number;
      percentage: number;
    };
    clients: {
      total: number;
    };
  };
}

// Reportes
export interface DashboardMetrics {
  period: number;
  revenue: number;
  totalAppointments: number;
  uniqueClients: number;
  appointmentsByStatus: Array<{
    status: string;
    count: number;
  }>;
  popularServices: Array<{
    serviceId: string;
    _count: { id: number };
    service: {
      id: string;
      name: string;
      price: number;
    };
  }>;
  dailyRevenue: Array<{
    date: string;
    amount: number;
  }>;
  hourlyStats: Array<{
    hour: string;
    count: number;
  }>;
}

export interface RevenueReport {
  totalRevenue: number;
  totalAppointments: number;
  data: Array<{
    period: string;
    revenue: number;
    appointments: number;
  }>;
}

export interface ServicesReport {
  data: Array<{
    service: Service;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    totalRevenue: number;
  }>;
}

export interface ClientsReport {
  data: Array<{
    client: Client;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    totalSpent: number;
    lastVisit: string | null;
  }>;
}

// Tipos específicos para el módulo de usuarios/empleados
export interface UserWithStats extends User {
  workingHours?: WorkingHours[];
  _count?: {
    appointments: number;
  };
  appointments?: Array<{
    id: string;
    startTime: string;
    client: { name: string };
    service: { name: string };
  }>;
}

export interface UserForm {
  name: string;
  email: string;
  password?: string;
  role?: 'ADMIN' | 'EMPLOYEE';
  phone?: string;
  avatar?: string;
}

export interface CreateUserForm extends UserForm {
  password: string;
  branchId?: string; // Sucursal específica (opcional)
}

export interface UpdateUserForm extends Partial<UserForm> {
  id: string;
}

export interface UserFilters {
  includeInactive?: boolean;
  search?: string;
  role?: 'ADMIN' | 'EMPLOYEE' | '' | null;
}

export interface UserStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    employeeUsers: number;
    recentUsers: number;
  };
  topPerformers: Array<{
    id: string;
    name: string;
    role: 'ADMIN' | 'EMPLOYEE';
    _count: {
      appointments: number;
    };
  }>;
}

// Tipos para el sistema de planes
export interface AvailablePlan {
  key: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  name: string;
  description: string;
  price: number;
  limits: {
    appointments: number;
    services: number;
    users: number;
  };
  features: string[];
  isCurrent: boolean;
}

export interface AvailablePlansResponse {
  currentPlan: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  plans: AvailablePlan[];
}

export interface PlanChangeResponse {
  business: BusinessConfig;
  newPlan: {
    name: string;
    description: string;
    price: number;
    limits: {
      appointments: number;
      services: number;
      users: number;
    };
    features: string[];
  };
} 