import axios from 'axios';
import type { Branch, CreateBranchData, UpdateBranchData, BranchService as BranchServiceType } from '../types/branch';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://turnio-backend-production.up.railway.app';

// Configurar axios (similar al archivo api.ts)
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/profile')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const branchService = {
  // Obtener todas las sucursales
  async getBranches(includeInactive?: boolean): Promise<Branch[]> {
    const params = new URLSearchParams();
    if (includeInactive) {
      params.append('includeInactive', 'true');
    }
    
    const response = await api.get(`/branches?${params.toString()}`);
    return response.data.data;
  },

  // Obtener una sucursal por ID
  async getBranchById(branchId: string): Promise<Branch> {
    const response = await api.get(`/branches/${branchId}`);
    return response.data.data;
  },

  // Crear nueva sucursal
  async createBranch(branchData: CreateBranchData): Promise<Branch> {
    const response = await api.post('/branches', branchData);
    return response.data.data;
  },

  // Actualizar sucursal
  async updateBranch(branchId: string, branchData: UpdateBranchData): Promise<Branch> {
    const response = await api.put(`/branches/${branchId}`, branchData);
    return response.data.data;
  },

  // Eliminar sucursal
  async deleteBranch(branchId: string): Promise<void> {
    await api.delete(`/branches/${branchId}`);
  },

  // Obtener servicios de una sucursal
  async getBranchServices(branchId: string): Promise<BranchServiceType[]> {
    const response = await api.get(`/branches/${branchId}/services`);
    return response.data.data;
  },

  // Asignar servicio a sucursal
  async assignServiceToBranch(branchId: string, serviceId: string, price?: number): Promise<BranchServiceType> {
    const response = await api.post(`/branches/${branchId}/services`, {
      serviceId,
      price
    });
    return response.data.data;
  }
}; 