import { 
  UserWithStats, 
  CreateUserForm, 
  UpdateUserForm, 
  UserFilters, 
  UserStats,
  ApiResponse 
} from '../types';
import api from './api';

export const userService = {
  // Obtener todos los usuarios/empleados
  async getUsers(filters?: UserFilters): Promise<UserWithStats[]> {
    const params = new URLSearchParams();
    
    if (filters?.includeInactive) {
      params.append('includeInactive', 'true');
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.role && (filters.role === 'ADMIN' || filters.role === 'EMPLOYEE')) {
      params.append('role', filters.role);
    }

    const response = await api.get<ApiResponse<UserWithStats[]>>(
      `/users${params.toString() ? `?${params.toString()}` : ''}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error obteniendo usuarios');
    }
    
    return response.data.data || [];
  },

  // Obtener un usuario específico
  async getUser(id: string): Promise<UserWithStats> {
    const response = await api.get<ApiResponse<UserWithStats>>(`/users/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error obteniendo usuario');
    }
    
    if (!response.data.data) {
      throw new Error('Usuario no encontrado');
    }
    
    return response.data.data;
  },

  // Crear nuevo usuario/empleado
  async createUser(userData: CreateUserForm): Promise<UserWithStats> {
    const response = await api.post<ApiResponse<UserWithStats>>('/users', userData);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error creando usuario');
    }
    
    if (!response.data.data) {
      throw new Error('Error en la respuesta del servidor');
    }
    
    return response.data.data;
  },

  // Actualizar usuario
  async updateUser(id: string, userData: Partial<UpdateUserForm>): Promise<UserWithStats> {
    // Remover campos vacíos o undefined
    const cleanData = Object.entries(userData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    const response = await api.put<ApiResponse<UserWithStats>>(`/users/${id}`, cleanData);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error actualizando usuario');
    }
    
    if (!response.data.data) {
      throw new Error('Error en la respuesta del servidor');
    }
    
    return response.data.data;
  },

  // Activar/desactivar usuario
  async toggleUserStatus(id: string, isActive: boolean): Promise<UserWithStats> {
    const response = await api.patch<ApiResponse<UserWithStats>>(
      `/users/${id}/status`, 
      { isActive }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error cambiando estado del usuario');
    }
    
    if (!response.data.data) {
      throw new Error('Error en la respuesta del servidor');
    }
    
    return response.data.data;
  },

  // Eliminar usuario (desactivar)
  async deleteUser(id: string): Promise<void> {
    const response = await api.delete<ApiResponse>(`/users/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error eliminando usuario');
    }
  },

  // Obtener estadísticas de usuarios
  async getUserStats(): Promise<UserStats> {
    const response = await api.get<ApiResponse<UserStats>>('/users/stats');
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error obteniendo estadísticas');
    }
    
    if (!response.data.data) {
      throw new Error('Error en la respuesta del servidor');
    }
    
    return response.data.data;
  },

  // Validar disponibilidad de email
  async validateEmail(email: string, excludeId?: string): Promise<boolean> {
    try {
      const filters: UserFilters = { includeInactive: true, search: email };
      const users = await this.getUsers(filters);
      
      // Filtrar por email exacto
      const existingUser = users.find(user => 
        user.email.toLowerCase() === email.toLowerCase() && 
        user.id !== excludeId
      );
      
      return !existingUser; // true si está disponible
    } catch {
      return true; // En caso de error, asumimos que está disponible
    }
  },

  // Generar contraseña temporal
  generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    
    // Asegurar al menos una mayúscula, una minúscula y un número
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    
    // Completar con caracteres aleatorios
    for (let i = 0; i < 5; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Mezclar caracteres
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}; 