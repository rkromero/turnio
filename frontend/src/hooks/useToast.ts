import { useState, useCallback } from 'react';
import type { Toast } from '../components/Toast';

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // Default 5 seconds
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Helper functions for different toast types
  const success = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'success',
      title,
      message,
      ...options,
    });
  }, [addToast]);

  const error = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'error',
      title,
      message,
      duration: options?.duration ?? 7000, // Errors stay longer
      ...options,
    });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'warning',
      title,
      message,
      ...options,
    });
  }, [addToast]);

  const info = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'info',
      title,
      message,
      ...options,
    });
  }, [addToast]);

  // Specialized success messages
  const successAppointment = useCallback((action: 'creada' | 'actualizada' | 'eliminada') => {
    return success(
      `Cita ${action} exitosamente`,
      `La cita ha sido ${action} correctamente.`
    );
  }, [success]);

  const successClient = useCallback((action: 'creado' | 'actualizado' | 'eliminado') => {
    return success(
      `Cliente ${action} exitosamente`,
      `El cliente ha sido ${action} correctamente.`
    );
  }, [success]);

  // Specialized error messages
  const errorNetwork = useCallback(() => {
    return error(
      'Error de conexión',
      'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
      {
        action: {
          label: 'Reintentar',
          onClick: () => window.location.reload()
        }
      }
    );
  }, [error]);

  const errorValidation = useCallback((message: string) => {
    return error(
      'Error de validación',
      message
    );
  }, [error]);

  return {
    toasts,
    addToast,
    dismissToast,
    dismissAll,
    success,
    error,
    warning,
    info,
    // Specialized helpers
    successAppointment,
    successClient,
    errorNetwork,
    errorValidation,
  };
}; 