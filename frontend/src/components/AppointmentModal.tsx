import React, { useState, useEffect } from 'react';
import type { Appointment, AppointmentForm, Service } from '../types';
import { useIsMobileSimple } from '../hooks/useIsMobile';
import { 
  X, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  FileText,
  DollarSign,
  Timer,
  Check
} from 'lucide-react';

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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const isMobile = useIsMobileSimple();

  useEffect(() => {
    if (appointment) {
      const startDateTime = new Date(appointment.startTime);
      // Usar la hora local sin conversión UTC para evitar problemas de zona horaria
      const year = startDateTime.getFullYear();
      const month = String(startDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(startDateTime.getDate()).padStart(2, '0');
      const hours = String(startDateTime.getHours()).padStart(2, '0');
      const minutes = String(startDateTime.getMinutes()).padStart(2, '0');
      const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

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
    setTouched({});
    setCurrentStep(1);
  }, [appointment, isOpen]);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'clientName':
        return !value.trim() ? 'El nombre del cliente es requerido' : '';
      case 'serviceId':
        return !value ? 'Debe seleccionar un servicio' : '';
      case 'startTime': {
        if (!value) return 'Debe seleccionar fecha y hora';
        const selectedDate = new Date(value);
        const now = new Date();
        const minFutureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos en el futuro
        return selectedDate < minFutureTime ? 'La fecha debe ser al menos 5 minutos en el futuro' : '';
      }
      case 'clientEmail':
        return value && !value.includes('@') ? 'Email inválido' : '';
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validar campos requeridos
    ['clientName', 'serviceId', 'startTime'].forEach(field => {
      const error = validateField(field, formData[field as keyof AppointmentForm] as string);
      if (error) newErrors[field] = error;
    });

    // Validar email si se proporciona
    if (formData.clientEmail) {
      const emailError = validateField('clientEmail', formData.clientEmail);
      if (emailError) newErrors.clientEmail = emailError;
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
    const error = validateField(field, formData[field as keyof AppointmentForm] as string);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Mínimo 5 minutos desde ahora (consistente con validación)
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

  const handleAttendanceChange = async (newStatus: 'COMPLETED' | 'NO_SHOW') => {
    if (!appointment) return;
    
    try {
      const updatedFormData = {
        ...formData,
        status: newStatus
      };
      
      await onSubmit(updatedFormData);
      onClose();
    } catch (error) {
      console.error('Error actualizando asistencia:', error);
    }
  };

  const canGoToNextStep = () => {
    if (currentStep === 1) {
      return formData.serviceId && formData.startTime && !errors.serviceId && !errors.startTime;
    }
    return true;
  };

  const handleNextStep = () => {
    if (canGoToNextStep() && currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const selectedService = getSelectedService();

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
            : 'bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden'
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
                  onClick={currentStep > 1 ? handlePrevStep : onClose}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg touch-manipulation"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {appointment ? 'Editar Cita' : 'Nueva Cita'}
                  </h2>
                  {!appointment && (
                    <p className="text-sm text-gray-500">
                      Paso {currentStep} de 2
                    </p>
                  )}
                </div>
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
                  {appointment ? 'Editar Cita' : 'Nueva Cita'}
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

          {/* Progress Bar - Solo móvil para nuevas citas */}
          {isMobile && !appointment && (
            <div className="px-4 py-2 bg-gray-50">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / 2) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{currentStep}/2</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className={`
            ${isMobile 
              ? 'flex-1 overflow-y-auto p-4' 
              : 'p-6 overflow-y-auto max-h-[60vh]'
            }
          `}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Servicio y Horario */}
              {(!isMobile || currentStep === 1) && (
                <div className="space-y-6">
                  {/* Servicio */}
                  <div>
                    <label className="label flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                      Servicio *
                    </label>
                    <select
                      name="serviceId"
                      value={formData.serviceId}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('serviceId')}
                      className={`input-field ${errors.serviceId ? 'input-error' : ''}`}
                    >
                      <option value="">Seleccionar servicio</option>
                      {services.filter(s => s.isActive).map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - {formatCurrency(service.price)}
                        </option>
                      ))}
                    </select>
                    {errors.serviceId && (
                      <p className="error-message">{errors.serviceId}</p>
                    )}
                  </div>

                  {/* Información del servicio seleccionado */}
                  {selectedService && (
                    <div className="info-card">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{selectedService.name}</h4>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Timer className="w-4 h-4 mr-1" />
                              {formatDuration(selectedService.duration)}
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              {formatCurrency(selectedService.price)}
                            </div>
                          </div>
                          {selectedService.description && (
                            <p className="text-sm text-gray-500 mt-2">{selectedService.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fecha y Hora */}
                  <div>
                    <label className="label flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-purple-600" />
                      Fecha y Hora *
                    </label>
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('startTime')}
                      min={getMinDateTime()}
                      className={`input-field ${errors.startTime ? 'input-error' : ''}`}
                    />
                    {errors.startTime && (
                      <p className="error-message">{errors.startTime}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Datos del Cliente */}
              {(!isMobile || currentStep === 2) && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <User className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Datos del Cliente</h3>
                  </div>
                  
                  <div>
                    <label className="label flex items-center">
                      <User className="w-4 h-4 mr-2 text-purple-600" />
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('clientName')}
                      className={`input-field ${errors.clientName ? 'input-error' : ''}`}
                      placeholder="Nombre completo del cliente"
                      autoComplete="name"
                    />
                    {errors.clientName && (
                      <p className="error-message">{errors.clientName}</p>
                    )}
                  </div>

                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <div>
                      <label className="label flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-purple-600" />
                        Email
                      </label>
                      <input
                        type="email"
                        name="clientEmail"
                        value={formData.clientEmail}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur('clientEmail')}
                        className={`input-field ${errors.clientEmail ? 'input-error' : ''}`}
                        placeholder="cliente@email.com"
                        autoComplete="email"
                      />
                      {errors.clientEmail && (
                        <p className="error-message">{errors.clientEmail}</p>
                      )}
                    </div>

                    <div>
                      <label className="label flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-purple-600" />
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        name="clientPhone"
                        value={formData.clientPhone}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="+54 9 11 1234-5678"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* Botones de Asistencia (solo para citas confirmadas) */}
                  {appointment && appointment.status === 'CONFIRMED' && (
                    <div>
                      <label className="label">Marcar asistencia</label>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => handleAttendanceChange('COMPLETED')}
                          className="flex-1 bg-green-50 text-green-700 py-3 px-4 rounded-lg font-medium hover:bg-green-100 transition-colors flex items-center justify-center"
                          disabled={isLoading}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Asistió
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttendanceChange('NO_SHOW')}
                          className="flex-1 bg-yellow-50 text-yellow-700 py-3 px-4 rounded-lg font-medium hover:bg-yellow-100 transition-colors flex items-center justify-center"
                          disabled={isLoading}
                        >
                          <X className="w-4 h-4 mr-2" />
                          No asistió
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Estado actual (solo mostrar para citas ya procesadas) */}
                  {appointment && (appointment.status === 'COMPLETED' || appointment.status === 'NO_SHOW' || appointment.status === 'CANCELLED') && (
                    <div>
                      <label className="label">Estado actual</label>
                      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        appointment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'NO_SHOW' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {appointment.status === 'COMPLETED' ? 'Completado - Cliente asistió' :
                         appointment.status === 'NO_SHOW' ? 'No asistió - Cliente no se presentó' :
                         'Cancelado'}
                      </div>
                    </div>
                  )}

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
                      placeholder="Información adicional sobre la cita..."
                    />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className={`
            ${isMobile 
              ? 'safe-area-bottom bg-white border-t border-gray-200 p-4 sticky bottom-0' 
              : 'px-6 py-4 border-t border-gray-200'
            }
          `}>
            {isMobile && !appointment ? (
              // Mobile steps navigation
              <div className="space-y-3">
                {currentStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!canGoToNextStep()}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                  >
                    <span>Continuar</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                ) : (
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="btn-secondary flex-1"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="btn-primary flex-1 flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="loading-spinner-mobile"></div>
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Crear Cita</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Desktop or edit mode
              <div className="flex justify-end space-x-3">
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
                  disabled={isLoading}
                  className="btn-primary flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner-mobile"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{appointment ? 'Actualizar' : 'Crear'} Cita</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AppointmentModal; 