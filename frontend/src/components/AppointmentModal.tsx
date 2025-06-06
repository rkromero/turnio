import React, { useState, useEffect } from 'react';
import type { Appointment, AppointmentForm, Service } from '../types';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AppointmentForm) => Promise<void>;
  appointment?: Appointment | null;
  services: Service[];
  isLoading?: boolean;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  appointment,
  services,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<AppointmentForm>({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    serviceId: '',
    startTime: '',
    notes: '',
    status: 'CONFIRMED'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (appointment) {
      const startDateTime = new Date(appointment.startTime);
      const formattedDateTime = startDateTime.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM

      setFormData({
        clientName: appointment.client?.name || '',
        clientEmail: appointment.client?.email || '',
        clientPhone: appointment.client?.phone || '',
        serviceId: appointment.serviceId,
        startTime: formattedDateTime,
        notes: appointment.notes || '',
        status: appointment.status
      });
    } else {
      setFormData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        serviceId: '',
        startTime: '',
        notes: '',
        status: 'CONFIRMED'
      });
    }
    setErrors({});
  }, [appointment, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'El nombre del cliente es requerido';
    }

    if (!formData.serviceId) {
      newErrors.serviceId = 'Debe seleccionar un servicio';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Debe seleccionar fecha y hora';
    } else {
      const selectedDate = new Date(formData.startTime);
      const now = new Date();
      if (selectedDate <= now) {
        newErrors.startTime = 'La fecha debe ser futura';
      }
    }

    if (formData.clientEmail && !formData.clientEmail.includes('@')) {
      newErrors.clientEmail = 'Email inválido';
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
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error al guardar cita:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Mínimo 30 minutos desde ahora
    return now.toISOString().slice(0, 16);
  };

  const getSelectedService = () => {
    return services.find(s => s.id === formData.serviceId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}min`;
  };

  if (!isOpen) return null;

  const selectedService = getSelectedService();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {appointment ? 'Editar Cita' : 'Nueva Cita'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Servicio */}
          <div>
            <label htmlFor="serviceId" className="block text-sm font-medium text-gray-700 mb-1">
              Servicio *
            </label>
            <select
              id="serviceId"
              name="serviceId"
              value={formData.serviceId}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.serviceId ? 'border-red-500' : ''
              }`}
            >
              <option value="">Seleccionar servicio</option>
              {services.filter(s => s.isActive).map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {formatCurrency(service.price)} ({formatDuration(service.duration)})
                </option>
              ))}
            </select>
            {errors.serviceId && (
              <p className="mt-1 text-sm text-red-600">{errors.serviceId}</p>
            )}
          </div>

          {/* Información del servicio seleccionado */}
          {selectedService && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900">{selectedService.name}</h4>
              <p className="text-sm text-gray-600">
                Duración: {formatDuration(selectedService.duration)} • Precio: {formatCurrency(selectedService.price)}
              </p>
              {selectedService.description && (
                <p className="text-sm text-gray-500 mt-1">{selectedService.description}</p>
              )}
            </div>
          )}

          {/* Fecha y Hora */}
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha y Hora *
            </label>
            <input
              type="datetime-local"
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              min={getMinDateTime()}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.startTime ? 'border-red-500' : ''
              }`}
            />
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
            )}
          </div>

          {/* Datos del Cliente */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Datos del Cliente</h3>
            
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                id="clientName"
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.clientName ? 'border-red-500' : ''
                }`}
                placeholder="Nombre completo del cliente"
              />
              {errors.clientName && (
                <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="clientEmail"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.clientEmail ? 'border-red-500' : ''
                  }`}
                  placeholder="cliente@email.com"
                />
                {errors.clientEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.clientEmail}</p>
                )}
              </div>

              <div>
                <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="clientPhone"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+54 9 11 1234-5678"
                />
              </div>
            </div>
          </div>

          {/* Estado (solo para edición) */}
          {appointment && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="CONFIRMED">Confirmado</option>
                <option value="COMPLETED">Completado</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="NO_SHOW">No asistió</option>
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas adicionales
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Información adicional sobre la cita..."
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </div>
            ) : (
              appointment ? 'Actualizar Cita' : 'Crear Cita'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal; 