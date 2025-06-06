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
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  businessId: string;
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
}

export interface ServiceForm {
  name: string;
  description?: string;
  duration: number;
  price: number;
  color?: string;
}

// Tipos para respuestas de API
export interface ApiResponse<T = any> {
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