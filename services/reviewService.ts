import { 
  Review, 
  ReviewData, 
  PublicReviewData, 
  ReviewFormData, 
  ReviewToken 
} from '../types/review';

const API_BASE_URL = typeof window !== 'undefined' 
  ? (window as any).ENV?.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  : 'http://localhost:5000/api';

// Obtener token de autenticación
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Headers con autenticación
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Obtener reseñas del negocio (autenticado)
export const getReviews = async (includeUnapproved = false): Promise<ReviewData> => {
  const response = await fetch(
    `${API_BASE_URL}/reviews?includeUnapproved=${includeUnapproved}`,
    {
      method: 'GET',
      headers: getAuthHeaders()
    }
  );

  if (!response.ok) {
    throw new Error('Error obteniendo reseñas');
  }

  const result = await response.json();
  return result.data;
};

// Obtener reseñas públicas por slug del negocio
export const getPublicReviews = async (
  businessSlug: string, 
  limit = 10
): Promise<PublicReviewData> => {
  const response = await fetch(
    `${API_BASE_URL}/reviews/public/${businessSlug}?limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Error obteniendo reseñas públicas');
  }

  const result = await response.json();
  return result.data;
};

// Obtener token para crear reseña pública
export const getReviewToken = async (appointmentId: string): Promise<ReviewToken> => {
  const response = await fetch(
    `${API_BASE_URL}/reviews/public/token/${appointmentId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Error obteniendo token de reseña');
  }

  const result = await response.json();
  return result.data;
};

// Crear reseña pública
export const createPublicReview = async (
  appointmentId: string,
  reviewData: ReviewFormData
): Promise<Review> => {
  const response = await fetch(
    `${API_BASE_URL}/reviews/public/${appointmentId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error creando reseña');
  }

  const result = await response.json();
  return result.data;
};

// Actualizar estado de reseña (solo admin)
export const updateReviewStatus = async (
  reviewId: string,
  updates: { isApproved?: boolean; isPublic?: boolean }
): Promise<Review> => {
  const response = await fetch(
    `${API_BASE_URL}/reviews/${reviewId}/status`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    throw new Error('Error actualizando reseña');
  }

  const result = await response.json();
  return result.data;
};

// Eliminar reseña (solo admin)
export const deleteReview = async (reviewId: string): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/reviews/${reviewId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders()
    }
  );

  if (!response.ok) {
    throw new Error('Error eliminando reseña');
  }
};

// Obtener reseñas de Google Business (simulado)
export const getGoogleReviews = async (businessId: string) => {
  // Esta función simula la integración con Google Reviews
  // En producción, se conectaría con la API de Google My Business
  return {
    reviews: [],
    averageRating: 0,
    totalReviews: 0,
    googleBusinessUrl: `https://www.google.com/search?q=${businessId}+reviews`
  };
}; 