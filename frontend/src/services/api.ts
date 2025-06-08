import axios from 'axios';
import type { 
  ApiResponse, 
  AuthResponse, 
  RegisterForm, 
  LoginForm,
  Appointment,
  AppointmentForm,
  Service,
  ServiceForm,
  BookingData,
  Client,
  BusinessConfig,
  BusinessConfigForm,
  UserWithWorkingHours,
  WorkingHoursForm,
  Holiday,
  HolidayForm,
  PlanUsage,
  DashboardMetrics,
  RevenueReport,
  ServicesReport,
  ClientsReport
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://turnio-backend-production.up.railway.app';

// Configurar axios
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // Para incluir cookies httpOnly
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo redirigir a login si NO es una petición de profile
    // (para evitar loop infinito en AuthContext)
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/profile')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  register: async (data: RegisterForm): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
  },

  login: async (data: LoginForm): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data.data!;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getProfile: async (): Promise<AuthResponse> => {
    const response = await api.get<ApiResponse<AuthResponse>>('/auth/profile');
    return response.data.data!;
  },
};

// Servicios de turnos
export const appointmentService = {
  getAppointments: async (params?: {
    date?: string;
    status?: string;
    serviceId?: string;
    userId?: string;
    clientId?: string;
  }): Promise<Appointment[]> => {
    const response = await api.get<ApiResponse<Appointment[]>>('/appointments', { params });
    return response.data.data || [];
  },

  createAppointment: async (data: AppointmentForm): Promise<Appointment> => {
    const response = await api.post<ApiResponse<Appointment>>('/appointments', data);
    return response.data.data!;
  },

  updateAppointment: async (id: string, data: Partial<AppointmentForm>): Promise<Appointment> => {
    const response = await api.put<ApiResponse<Appointment>>(`/appointments/${id}`, data);
    return response.data.data!;
  },

  cancelAppointment: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`);
  },

  getAvailableSlots: async (businessSlug: string, params: {
    date: string;
    serviceId?: string;
  }): Promise<BookingData> => {
    const response = await api.get<ApiResponse<BookingData>>(
      `/appointments/public/${businessSlug}/available-slots`,
      { params }
    );
    return response.data.data!;
  },
};

// Servicios de servicios
export const serviceService = {
  getServices: async (includeInactive?: boolean): Promise<Service[]> => {
    const response = await api.get<ApiResponse<Service[]>>('/services', {
      params: { includeInactive }
    });
    return response.data.data || [];
  },

  createService: async (data: ServiceForm): Promise<Service> => {
    const response = await api.post<ApiResponse<Service>>('/services', data);
    return response.data.data!;
  },

  updateService: async (id: string, data: Partial<ServiceForm>): Promise<Service> => {
    const response = await api.put<ApiResponse<Service>>(`/services/${id}`, data);
    return response.data.data!;
  },

  deleteService: async (id: string): Promise<void> => {
    await api.delete(`/services/${id}`);
  },

  getServiceStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get('/services/stats', { params });
    return response.data.data || [];
  },
};

// Servicio para reservas públicas
export const publicService = {
  bookAppointment: async (businessSlug: string, data: {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    serviceId: string;
    startTime: string;
    notes?: string;
  }) => {
    const response = await api.post(`/public/${businessSlug}/book`, data);
    return response.data.data;
  },
};

// Dashboard APIs
export const dashboardApi = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getUpcomingAppointments: async () => {
    const response = await api.get('/appointments?upcoming=true&limit=10');
    return response.data;
  },

  getTodayAppointments: async () => {
    const response = await api.get('/appointments?today=true');
    return response.data;
  }
};

// Servicios de clientes
export const clientService = {
  getClients: async (): Promise<Client[]> => {
    const response = await api.get<ApiResponse<Client[]>>('/clients');
    return response.data.data || [];
  },

  getClient: async (id: string): Promise<Client> => {
    const response = await api.get<ApiResponse<Client>>(`/clients/${id}`);
    return response.data.data!;
  },

  createClient: async (data: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  }): Promise<Client> => {
    const response = await api.post<ApiResponse<Client>>('/clients', data);
    return response.data.data!;
  },

  updateClient: async (id: string, data: Partial<{
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  }>): Promise<Client> => {
    const response = await api.put<ApiResponse<Client>>(`/clients/${id}`, data);
    return response.data.data!;
  },

  deleteClient: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`);
  },
};

// Servicios de configuración
export const configService = {
  // Configuración del negocio
  getBusinessConfig: async (): Promise<BusinessConfig> => {
    const response = await api.get<ApiResponse<BusinessConfig>>('/config/business');
    return response.data.data!;
  },

  updateBusinessConfig: async (data: BusinessConfigForm): Promise<BusinessConfig> => {
    const response = await api.put<ApiResponse<BusinessConfig>>('/config/business', data);
    return response.data.data!;
  },

  // Horarios de trabajo
  getWorkingHours: async (): Promise<UserWithWorkingHours[]> => {
    const response = await api.get<ApiResponse<UserWithWorkingHours[]>>('/config/working-hours');
    return response.data.data || [];
  },

  updateWorkingHours: async (userId: string, workingHours: WorkingHoursForm[]): Promise<UserWithWorkingHours> => {
    const response = await api.put<ApiResponse<UserWithWorkingHours>>(`/config/working-hours/${userId}`, {
      workingHours
    });
    return response.data.data!;
  },

  // Feriados
  getHolidays: async (year?: number): Promise<Holiday[]> => {
    const params = year ? { year: year.toString() } : {};
    const response = await api.get<ApiResponse<Holiday[]>>('/config/holidays', { params });
    return response.data.data || [];
  },

  createHoliday: async (data: HolidayForm): Promise<Holiday> => {
    const response = await api.post<ApiResponse<Holiday>>('/config/holidays', data);
    return response.data.data!;
  },

  updateHoliday: async (id: string, data: Partial<HolidayForm>): Promise<Holiday> => {
    const response = await api.put<ApiResponse<Holiday>>(`/config/holidays/${id}`, data);
    return response.data.data!;
  },

  deleteHoliday: async (id: string): Promise<void> => {
    await api.delete(`/config/holidays/${id}`);
  },

  // Estadísticas de plan
  getPlanUsage: async (): Promise<PlanUsage> => {
    const response = await api.get<ApiResponse<PlanUsage>>('/config/plan-usage');
    return response.data.data!;
  }
};

// Servicios de reportes
export const reportService = {
  getDashboardMetrics: async (period: number = 30): Promise<DashboardMetrics> => {
    const response = await api.get<ApiResponse<DashboardMetrics>>(`/reports/dashboard?period=${period}`);
    return response.data.data!;
  },

  getRevenueReport: async (params: {
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<RevenueReport> => {
    const response = await api.get<ApiResponse<RevenueReport>>('/reports/revenue', { params });
    return response.data.data!;
  },

  getServicesReport: async (params: {
    startDate: string;
    endDate: string;
  }): Promise<ServicesReport> => {
    const response = await api.get<ApiResponse<ServicesReport>>('/reports/services', { params });
    return response.data.data!;
  },

  getClientsReport: async (params: {
    startDate: string;
    endDate: string;
  }): Promise<ClientsReport> => {
    const response = await api.get<ApiResponse<ClientsReport>>('/reports/clients', { params });
    return response.data.data!;
  }
};

// Servicios de planes
export const planService = {
  getAvailablePlans: async () => {
    const response = await api.get('/plans/available');
    return response.data.data;
  },

  getCurrentPlan: async () => {
    const response = await api.get('/plans/current');
    return response.data.data;
  },

  changePlan: async (newPlan: string) => {
    const response = await api.put('/plans/change', { newPlan });
    return response.data.data;
  },
};

export default api; 