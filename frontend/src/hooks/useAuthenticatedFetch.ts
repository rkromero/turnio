import { useCallback } from 'react';

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

export const useAuthenticatedFetch = () => {
  const fetchWithAuth = useCallback(async (url: string, options: FetchOptions = {}) => {
    const { requireAuth = true, ...fetchOptions } = options;
    
    // Preparar headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers
    };

    // Agregar token de autenticación si es requerido
    if (requireAuth) {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No hay token de autenticación disponible');
        throw new Error('No autenticado');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Construir URL completa
    const baseUrl = import.meta.env.VITE_API_URL || 'https://turnio-backend-production.up.railway.app';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    console.log(`🌐 Fetching: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, {
        ...fetchOptions,
        headers
      });

      // Manejo de errores específicos
      if (response.status === 401) {
        console.error('Token de autenticación inválido o expirado');
        // Opcional: limpiar token y redirigir al login
        localStorage.removeItem('token');
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }

      if (response.status === 403) {
        throw new Error('No tienes permisos para realizar esta acción');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error ${response.status}:`, errorText);
        throw new Error(`Error del servidor: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error('Error en fetch:', error);
      throw error;
    }
  }, []);

  return fetchWithAuth;
}; 