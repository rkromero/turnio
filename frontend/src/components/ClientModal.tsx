import React, { useState, useEffect } from 'react';
import type { Client } from '../types';
import { useIsMobileSimple } from '../hooks/useIsMobile';
import { 
  X, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  FileText,
  Check
} from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  }) => Promise<void>;
  client?: Client | null;
  isLoading?: boolean;
}

const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  client,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobileSimple();

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        notes: client.notes || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        notes: ''
      });
    }
    setErrors({});
    setTouched({});
  }, [client, isOpen]);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        return !value.trim() ? 'El nombre es requerido' : '';
      case 'email':
        return value && !value.includes('@') ? 'Email inválido' : '';
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar campos requeridos
    const nameError = validateField('name', formData.name);
    if (nameError) newErrors.name = nameError;

    // Validar email si se proporciona
    if (formData.email) {
      const emailError = validateField('email', formData.email);
      if (emailError) newErrors.email = emailError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        notes: formData.notes.trim() || undefined
      };
      
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error al guardar cliente:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validación en tiempo real
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ 
        ...prev, 
        [name]: error 
      }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = formData[field as keyof typeof formData];
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        fixed z-50 
        ${isMobile 
          ? 'inset-0 bg-white' 
          : 'inset-0 flex items-center justify-center p-4'
        }
      `}>
        <div className={`
          ${isMobile 
            ? 'h-full w-full flex flex-col' 
            : 'bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden'
          }
        `}>
          {/* Header */}
          <div className={`
            ${isMobile 
              ? 'safe-area-top bg-white border-b border-gray-200 px-4 py-4 flex items-center sticky top-0 z-10' 
              : 'px-6 py-4 border-b border-gray-200'
            }
          `}>
            {isMobile ? (
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={onClose}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg touch-manipulation"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">
                  {client ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg touch-manipulation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {client ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className={`
            ${isMobile 
              ? 'flex-1 overflow-y-auto p-4' 
              : 'p-6'
            }
          `}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre */}
              <div>
                <label className="label flex items-center">
                  <User className="w-4 h-4 mr-2 text-purple-600" />
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('name')}
                  className={`input-field ${errors.name ? 'input-error' : ''}`}
                  placeholder="Nombre completo del cliente"
                  autoComplete="name"
                />
                {errors.name && (
                  <p className="error-message">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="label flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-purple-600" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('email')}
                  className={`input-field ${errors.email ? 'input-error' : ''}`}
                  placeholder="cliente@email.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="error-message">{errors.email}</p>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className="label flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-purple-600" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="+54 9 11 1234-5678"
                  autoComplete="tel"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="label flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-purple-600" />
                  Notas adicionales
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={isMobile ? 3 : 3}
                  className="input-field resize-none"
                  placeholder="Información adicional sobre el cliente..."
                />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className={`
            ${isMobile 
              ? 'safe-area-bottom bg-white border-t border-gray-200 p-4 sticky bottom-0' 
              : 'px-6 py-4 border-t border-gray-200'
            }
          `}>
            <div className={`flex ${isMobile ? 'space-x-3' : 'justify-end space-x-3'}`}>
              <button
                type="button"
                onClick={onClose}
                className={`btn-secondary ${isMobile ? 'flex-1' : ''}`}
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={`btn-primary flex items-center justify-center space-x-2 ${isMobile ? 'flex-1' : ''}`}
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner-mobile"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{client ? 'Actualizar' : 'Crear'} Cliente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientModal; 