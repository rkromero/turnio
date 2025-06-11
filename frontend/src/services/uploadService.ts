// Servicio para manejo de uploads de imágenes
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'; // Comentado temporalmente hasta implementar endpoint real

export interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    filename: string;
    size: number;
  };
  message?: string;
}

export const uploadService = {
  // Subir imagen (por ahora simulado, se puede reemplazar con endpoint real)
  async uploadImage(file: File): Promise<string> {
    // Validaciones
    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten archivos de imagen');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      throw new Error('La imagen no puede superar los 5MB');
    }

    try {
      // Opción 1: Usar endpoint real (descomenta si tienes un endpoint de upload)
      /*
      const formData = new FormData();
      formData.append('image', file);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/upload/image`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error al subir la imagen');
      }

      const result: UploadResponse = await response.json();
      return result.data.url;
      */

      // Opción 2: Simulación con conversión a base64 (temporal)
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Error procesando la imagen'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error leyendo el archivo'));
        };
        
        reader.readAsDataURL(file);
      });

    } catch (error) {
      console.error('Error en uploadImage:', error);
      throw error instanceof Error ? error : new Error('Error desconocido al subir imagen');
    }
  },

  // Validar archivo de imagen
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'Solo se permiten archivos de imagen' };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { isValid: false, error: 'La imagen no puede superar los 5MB' };
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Formato no soportado. Use JPG, PNG, WEBP o GIF' };
    }

    return { isValid: true };
  },

  // Obtener preview de imagen
  getImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Error generando preview'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error leyendo el archivo'));
      };
      
      reader.readAsDataURL(file);
    });
  }
}; 