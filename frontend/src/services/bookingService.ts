import axios from 'axios';
import { ProfessionalsResponse, BookingFormData, BookingResponse } from '../types/booking';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const bookingService = {
  // Obtener profesionales disponibles
  async getProfessionals(businessSlug: string, date?: string, serviceId?: string): Promise<ProfessionalsResponse> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (serviceId) params.append('serviceId', serviceId);
    
    const response = await axios.get(
      `${API_URL}/appointments/public/${businessSlug}/professionals?${params.toString()}`
    );
    return response.data;
  },

  // Obtener servicios del negocio
  async getServices(businessSlug: string) {
    const response = await axios.get(`${API_URL}/services/public/${businessSlug}`);
    return response.data;
  },

  // Obtener horarios disponibles (método existente mejorado)
  async getAvailableSlots(businessSlug: string, date: string, serviceId?: string, professionalId?: string) {
    const params = new URLSearchParams();
    params.append('date', date);
    if (serviceId) params.append('serviceId', serviceId);
    if (professionalId) params.append('professionalId', professionalId);
    
    const response = await axios.get(
      `${API_URL}/appointments/public/${businessSlug}/available-slots?${params.toString()}`
    );
    return response.data;
  },

  // Crear reserva con soporte para profesional
  async createBooking(businessSlug: string, bookingData: BookingFormData): Promise<BookingResponse> {
    const response = await axios.post(
      `${API_URL}/public/${businessSlug}/book`,
      bookingData
    );
    return response.data;
  },

  // Obtener información del negocio
  async getBusinessInfo(businessSlug: string) {
    const response = await axios.get(`${API_URL}/businesses/public/${businessSlug}`);
    return response.data;
  }
}; 