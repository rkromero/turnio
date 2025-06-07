export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  isActive: boolean;
}

export interface TimeSlot {
  time: string;
  datetime: string;
  available: boolean;
}

export interface Professional {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  role: 'ADMIN' | 'EMPLOYEE';
  availableSlots?: TimeSlot[];
  workingToday?: boolean;
  workingHours?: {
    start: string;
    end: string;
  };
}

export interface ProfessionalsResponse {
  success: boolean;
  data: {
    business: {
      id: string;
      name: string;
      slug: string;
    };
    service: Service | null;
    professionals: Professional[];
    totalProfessionals: number;
    date: string | null;
  };
}

export interface BookingFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceId: string;
  startTime: string;
  notes?: string;
  professionalId?: string;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  data?: {
    appointmentId: string;
    clientName: string;
    serviceName: string;
    professionalName: string;
    professionalAvatar?: string;
    startTime: string;
    duration: number;
    businessName: string;
    wasAutoAssigned: boolean;
  };
} 