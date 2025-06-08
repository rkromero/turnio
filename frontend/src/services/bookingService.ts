import axios from 'axios';
import { ProfessionalsResponse, BookingFormData, BookingResponse, BookingData } from '../types/booking';

// Usar la misma configuración que api.ts
const BASE_URL = import.meta.env.VITE_API_URL || 'https://turnio-backend-production.up.railway.app';

export const bookingService = {
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

  // Obtener servicios del negocio
  async getServices(businessSlug: string) {
    const response = await axios.get(
      `${BASE_URL}/api/public/${businessSlug}/services`
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