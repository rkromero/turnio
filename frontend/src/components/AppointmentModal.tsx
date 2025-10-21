import React, { useState, useEffect } from 'react';
import type { Appointment, AppointmentForm, Service } from '../types';
import { useIsMobileSimple } from '../hooks/useIsMobile';
import { useAuth } from '../context/AuthContext';
import { appointmentService } from '../services/api';
import toast from 'react-hot-toast';
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
  Check,
  Users,
  Trash2
} from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  email: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AppointmentForm) => Promise<void>;
  onDelete?: (appointmentId: string) => Promise<void>;
  appointment?: Appointment | null;
  services: Service[];
  professionals?: Professional[];
  isLoading?: boolean;
  initialDate?: string;
  initialTime?: string;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  appointment,
  services,
  professionals = [],
  isLoading = false,
  initialDate,
  initialTime
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  
  const [formData, setFormData] = useState<AppointmentForm>({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    serviceId: '',
    userId: '',
    startTime: '',
    notes: '',
    status: 'CONFIRMED'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableTimes, setAvailableTimes] = useState<Array<{time: string, datetime: string}>>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const isMobile = useIsMobileSimple();

  useEffect(() => {
    if (appointment) {
      const startDateTime = new Date(appointment.startTime);
      // Usar UTC para evitar conversión de zona horaria
      const year = startDateTime.getUTCFullYear();
      const month = String(startDateTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(startDateTime.getUTCDate()).padStart(2, '0');
      const hours = String(startDateTime.getUTCHours()).padStart(2, '0');
      const minutes = String(startDateTime.getUTCMinutes()).padStart(2, '0');
      const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      const formattedDate = `${year}-${month}-${day}`;
      const formattedTime = `${hours}:${minutes}`;

      setFormData({
        clientName: appointment.client?.name || '',
        clientEmail: appointment.client?.email || '',
        clientPhone: appointment.client?.phone || '',
        serviceId: appointment.serviceId,
        userId: appointment.userId || '',
        startTime: formattedDateTime,
        notes: appointment.notes || '',
        status: appointment.status
      });
      setSelectedDate(formattedDate);
      setSelectedTime(formattedTime);
    } else {
      // Pre-cargar fecha y hora inicial si se proporcionaron
      const preloadedDate = initialDate || '';
      const preloadedTime = initialTime || '';
      
      // Si hay fecha Y hora pre-cargadas, combinarlas en startTime
      const preloadedStartTime = (preloadedDate && preloadedTime) 
        ? `${preloadedDate}T${preloadedTime}` 
        : '';
      
      console.log('🔄 [INIT MODAL] Pre-loading:', { 
        preloadedDate, 
        preloadedTime, 
        preloadedStartTime 
      });
      
      setFormData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        serviceId: '',
        userId: '',
        startTime: preloadedStartTime,
        notes: '',
        status: 'CONFIRMED'
      });
      
      setSelectedDate(preloadedDate);
      setSelectedTime(preloadedTime);
      setAvailableTimes([]);
    }
    setErrors({});
    setTouched({});
    setCurrentStep(1);
  }, [appointment, isOpen, initialDate, initialTime]);

  // Limpiar hora seleccionada cuando cambia servicio o profesional (solo al crear, no al editar)
  // Esto evita que se muestre un horario que ya no está disponible
  const serviceIdRef = React.useRef(formData.serviceId);
  const userIdRef = React.useRef(formData.userId);
  
  useEffect(() => {
    // Solo limpiar si realmente cambió (no en mount inicial)
    const serviceChanged = serviceIdRef.current && serviceIdRef.current !== formData.serviceId;
    const userChanged = userIdRef.current !== undefined && userIdRef.current !== formData.userId;
    
    if (!appointment && (serviceChanged || userChanged) && selectedTime) {
      setSelectedTime('');
      setFormData(prev => ({ ...prev, startTime: '' }));
      toast('Los horarios disponibles han cambiado. Por favor, selecciona un nuevo horario.', {
        duration: 3000,
        position: 'top-center',
        icon: 'ℹ️'
      });
    }
    
    // Actualizar refs
    serviceIdRef.current = formData.serviceId;
    userIdRef.current = formData.userId;
  }, [formData.serviceId, formData.userId, appointment, selectedTime]);

  // Cargar horarios disponibles cuando cambian fecha o servicio
  useEffect(() => {
    const loadAvailableTimes = async () => {
      if (!selectedDate || !formData.serviceId) {
        setAvailableTimes([]);
        return;
      }

      setLoadingTimes(true);
      try {
        const times = await appointmentService.getAvailableTimes({
          date: selectedDate,
          serviceId: formData.serviceId,
          ...(formData.userId && { userId: formData.userId })
        });
        
        // Si estamos editando un turno, agregar su horario actual a la lista
        // (porque no aparecerá en los disponibles ya que está ocupado)
        if (appointment && selectedTime) {
          const currentTimeExists = times.some(t => t.time === selectedTime);
          if (!currentTimeExists) {
            const currentDateTime = `${selectedDate}T${selectedTime}`;
            times.unshift({
              time: selectedTime,
              datetime: currentDateTime
            });
          }
        }
        
        setAvailableTimes(times);
      } catch (error) {
        console.error('Error cargando horarios disponibles:', error);
        setAvailableTimes([]);
      } finally {
        setLoadingTimes(false);
      }
    };

    loadAvailableTimes();
  }, [selectedDate, formData.serviceId, formData.userId, appointment, selectedTime]);

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
        
        if (selectedDate < minFutureTime) {
          return 'La fecha debe ser al menos 5 minutos en el futuro';
        }
        
        // Validar que los minutos sean 00 o 30
        const minutes = selectedDate.getMinutes();
        if (minutes !== 0 && minutes !== 30) {
          return 'Solo se permiten horarios en punto (00) o y media (30)';
        }
        
        return '';
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

  const handleDelete = async () => {
    if (!appointment || !onDelete) return;
    
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas cancelar este turno? Esta acción no se puede deshacer y el espacio quedará libre para otros clientes.'
    );
    
    if (confirmed) {
      try {
        await onDelete(appointment.id);
        onClose();
        toast.success('Turno cancelado exitosamente');
      } catch (error) {
        console.error('Error al cancelar turno:', error);
        toast.error('Error al cancelar el turno');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('📝 [INPUT CHANGE]', { name, value });
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validación en tiempo real
    if (touched[name]) {
      const error = validateField(name, value);
      console.log('✔️ [VALIDATION]', { name, error });
      setErrors(prev => ({ 
        ...prev, 
        [name]: error 
      }));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    console.log('📅 [DATE CHANGE]', { date });
    setSelectedDate(date);
    setSelectedTime(''); // Resetear hora al cambiar fecha
    setFormData(prev => ({ ...prev, startTime: '' }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const time = e.target.value;
    console.log('⏰ [TIME CHANGE]', { time, selectedDate });
    setSelectedTime(time);
    
    if (selectedDate && time) {
      const combinedDateTime = `${selectedDate}T${time}`;
      console.log('🔗 [COMBINED DATETIME]', { combinedDateTime });
      setFormData(prev => ({ ...prev, startTime: combinedDateTime }));
      
      // Validar
      const error = validateField('startTime', combinedDateTime);
      console.log('✔️ [VALIDATION]', { error, combinedDateTime });
      setErrors(prev => ({ ...prev, startTime: error }));
    } else {
      console.log('⚠️ [TIME CHANGE] Missing date or time', { selectedDate, time });
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
      const hasService = !!formData.serviceId;
      const hasTime = !!formData.startTime;
      const noServiceError = !errors.serviceId;
      const noTimeError = !errors.startTime;
      
      console.log('🔍 [CAN GO TO NEXT STEP]', {
        hasService,
        hasTime,
        noServiceError,
        noTimeError,
        formData,
        errors,
        selectedDate,
        selectedTime,
        canContinue: hasService && hasTime && noServiceError && noTimeError
      });
      
      return hasService && hasTime && noServiceError && noTimeError;
    }
    return true;
  };

  const handleNextStep = () => {
    console.log('🎯 [HANDLE NEXT STEP] Clicked!', { 
      canGo: canGoToNextStep(), 
      currentStep 
    });
    
    if (canGoToNextStep() && currentStep < 2) {
      console.log('✅ [HANDLE NEXT STEP] Moving to step 2');
      setCurrentStep(currentStep + 1);
    } else {
      console.log('❌ [HANDLE NEXT STEP] Cannot proceed', {
        canGoToNextStep: canGoToNextStep(),
        currentStep,
        formData,
        errors
      });
      
      // Mostrar mensaje de debug en pantalla
      const hasService = !!formData.serviceId;
      const hasTime = !!formData.startTime;
      const serviceError = errors.serviceId;
      const timeError = errors.startTime;
      
      let message = 'No se puede continuar:\n';
      if (!hasService) message += '❌ Falta seleccionar servicio\n';
      if (!hasTime) message += '❌ Falta seleccionar fecha y hora\n';
      if (serviceError) message += `❌ Error en servicio: ${serviceError}\n`;
      if (timeError) message += `❌ Error en hora: ${timeError}\n`;
      
      message += `\nDatos actuales:\n`;
      message += `Servicio: ${formData.serviceId || 'No seleccionado'}\n`;
      message += `Fecha: ${selectedDate || 'No seleccionada'}\n`;
      message += `Hora: ${selectedTime || 'No seleccionada'}\n`;
      message += `StartTime: ${formData.startTime || 'No definido'}\n`;
      
      alert(message);
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

                  {/* Profesional (solo para ADMIN) */}
                  {isAdmin && professionals.length > 0 && (
                    <div>
                      <label className="label flex items-center">
                        <Users className="w-4 h-4 mr-2 text-purple-600" />
                        Profesional
                      </label>
                      <select
                        name="userId"
                        value={formData.userId}
                        onChange={handleInputChange}
                        className="input-field"
                      >
                        <option value="">Sin asignar</option>
                        {professionals.map((professional) => (
                          <option key={professional.id} value={professional.id}>
                            {professional.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Si no seleccionás ninguno, el turno quedará sin asignar
                      </p>
                    </div>
                  )}

                  {/* Fecha */}
                  <div>
                    <label className="label flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                      Fecha *
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={handleDateChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="input-field"
                    />
                  </div>

                  {/* Hora */}
                  <div>
                    <label className="label flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-purple-600" />
                      Hora *
                    </label>
                    <select
                      value={selectedTime}
                      onChange={handleTimeChange}
                      disabled={!selectedDate || !formData.serviceId || loadingTimes}
                      className={`input-field ${errors.startTime ? 'input-error' : ''}`}
                    >
                      <option value="">
                        {loadingTimes ? 'Cargando horarios...' : 
                         !selectedDate ? 'Primero selecciona una fecha' : 
                         !formData.serviceId ? 'Primero selecciona un servicio' :
                         availableTimes.length === 0 ? 'No hay horarios disponibles' :
                         'Selecciona un horario'}
                      </option>
                      {availableTimes.map((slot) => (
                        <option key={slot.time} value={slot.time}>
                          {slot.time}
                        </option>
                      ))}
                    </select>
                    {availableTimes.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {availableTimes.length} {availableTimes.length === 1 ? 'horario disponible' : 'horarios disponibles'}
                      </p>
                    )}
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
              // Mobile steps navigation (crear nueva cita)
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
            ) : isMobile && appointment ? (
              // Mobile edit mode (editar cita existente)
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1"
                    disabled={isLoading}
                  >
                    Cancelar
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
                        <span>Actualizar</span>
                      </>
                    )}
                  </button>
                </div>
                {onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Cancelar Turno</span>
                  </button>
                )}
              </div>
            ) : (
              // Desktop or edit mode
              <div className="flex justify-between items-center gap-3">
                {appointment && onDelete ? (
                  // Modo edición con 3 botones
                  <>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm flex items-center space-x-2"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Cancelar Turno</span>
                    </button>
                    <div className="flex space-x-2 ml-auto">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                        disabled={isLoading}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm flex items-center space-x-2"
                      >
                        {isLoading ? (
                          <>
                            <div className="loading-spinner-mobile"></div>
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Actualizar Cita</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  // Modo creación con 2 botones
                  <div className="flex space-x-3 ml-auto">
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
                          <span>Crear Cita</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AppointmentModal; 