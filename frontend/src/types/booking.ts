export interface Business {
  id: string;
  name: string;
  slug: string;
}

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  description: string | null;
  banner: string | null;
  bannerAlt: string | null;
  isMain: boolean;
  latitude: number | null;
  longitude: number | null;
  professionalCount: number;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  color?: string;
  isActive: boolean;
}

export interface TimeSlot {
  time: string;
  datetime: string;
  isAvailable: boolean;
}

export interface Professional {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  role: string;
  specialties?: string[];
  rating?: number;
  availableSlots?: TimeSlot[];
  workingToday?: boolean;
  slotsCount?: number;
  workingHours?: {
    start: string;
    end: string;
  };
}

export interface UrgencyStats {
  totalSlots: number;
  availableSlots: number;
  occupiedSlots?: number;
  occupancy?: number;
  urgencyLevel: 'low' | 'medium' | 'high';
  urgencyMessage: string;
}

export interface ProfessionalsResponse {
  success: boolean;
  data: {
    business: Business;
    service?: Service;
    professionals: Professional[];
    totalProfessionals: number;
    date?: string;
    urgency?: UrgencyStats;
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
  paymentMethod?: 'local' | 'online';
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

export interface BookingData {
  business: Business;
  service?: Service;
  date: string;
  slots: {
    professional: {
      id: string;
      name: string;
      avatar?: string;
      phone?: string;
      role: string;
    };
    slots: TimeSlot[];
    workingHours: {
      start: string;  
      end: string;
    };
  }[];
  urgency: UrgencyStats;
}

// Tipos para opciones de pago
export interface PaymentOptions {
  canPayLater: boolean;
  canPayOnline: boolean;
  requiresPayment: boolean;
  scoring: {
    starRating: number;
    totalBookings: number;
    attendedCount: number;
    noShowCount: number;
  } | null;
  reason: string;
}

export interface PaymentOptionsResponse {
  success: boolean;
  data: {
    paymentOptions: PaymentOptions;
    message: string;
    clientScoring: {
      starRating: number;
      totalBookings: number;
      attendedCount: number;
      noShowCount: number;
    } | null;
  };
} 