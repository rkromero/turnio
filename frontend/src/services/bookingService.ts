import axios from 'axios';
import { ProfessionalsResponse, BookingFormData, BookingResponse, BookingData, Service, Business } from '../types/booking';

// Usar la misma configuración que api.ts
const BASE_URL = import.meta.env.VITE_API_URL || 'https://turnio-backend-production.up.railway.app';

export const bookingService = {
  // Obtener sucursales públicas de un negocio
  async getPublicBranches(businessSlug: string): Promise<{ 
    success: boolean; 
    data: { 
      business: { id: string; name: string; slug: string };
      branches: Array<{
        id: string;
        name: string;
        slug: string;
        address: string | null;
        phone: string | null;
        description: string | null;
        isMain: boolean;
        latitude: number | null;
        longitude: number | null;
        professionalCount: number;
      }>;
    } 
  }> {
    const response = await axios.get(
      `${BASE_URL}/api/appointments/public/${businessSlug}/branches`
    );
    return response.data;
  },

  // Obtener profesionales disponibles
  async getProfessionals(businessSlug: string, date?: string, serviceId?: string): Promise<ProfessionalsResponse> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (serviceId) params.append('serviceId', serviceId);
    
    const response = await axios.get(
      `${BASE_URL}/api/appointments/public/${businessSlug}/professionals?${params.toString()}`
    );
    return response.data;
  },

  // Obtener todos los profesionales del negocio (para modo "por profesional")
  async getAllProfessionals(businessSlug: string): Promise<ProfessionalsResponse> {
    const response = await axios.get(
      `${BASE_URL}/api/appointments/public/${businessSlug}/all-professionals`
    );
    return response.data;
  },

  // Obtener servicios que puede realizar un profesional específico
  async getProfessionalServices(businessSlug: string, professionalId: string): Promise<{ success: boolean; data: { serviceIds: string[] } }> {
    const response = await axios.get(
      `${BASE_URL}/api/appointments/public/${businessSlug}/professional/${professionalId}/services`
    );
    return response.data;
  },

  // Obtener disponibilidad de un profesional para un servicio específico
  async getProfessionalAvailability(businessSlug: string, professionalId: string, serviceId: string): Promise<{ 
    success: boolean; 
    data: { 
      professional: { id: string; name: string };
      service: { id: string; name: string; duration: number };
      availability: Array<{ date: string; available: boolean; slotsCount: number; reason?: string }>;
      suggestedDates: string[];
    } 
  }> {
    const response = await axios.get(
      `${BASE_URL}/api/appointments/public/${businessSlug}/professional/${professionalId}/availability?serviceId=${serviceId}`
    );
    return response.data;
  },

  // Obtener servicios del negocio
  async getServices(businessSlug: string): Promise<{ success: boolean; business: Business; services: Service[] }> {
    const response = await axios.get(
      `${BASE_URL}/api/appointments/public/${businessSlug}/services`
    );
    return response.data;
  },

  // Obtener horarios disponibles (método actualizado)
  async getAvailableSlots(businessSlug: string, date: string, serviceId?: string, professionalId?: string): Promise<{ success: boolean; data: BookingData }> {
    const params = new URLSearchParams();
    params.append('date', date);
    if (serviceId) params.append('serviceId', serviceId);
    if (professionalId) params.append('professionalId', professionalId);
    
    const response = await axios.get(
      `${BASE_URL}/api/appointments/public/${businessSlug}/available-slots?${params.toString()}`
    );
    return response.data;
  },

  // Crear reserva con soporte para profesional
  async createBooking(businessSlug: string, bookingData: BookingFormData): Promise<BookingResponse> {
    const response = await axios.post(
      `${BASE_URL}/api/public/${businessSlug}/book`,
      bookingData
    );
    return response.data;
  },

  // Obtener información del negocio
  async getBusinessInfo(businessSlug: string) {
    const response = await axios.get(`${BASE_URL}/api/businesses/public/${businessSlug}`);
    return response.data;
  }
}; 