import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { Professional, Service, BookingFormData } from '../types/booking';
import ProfessionalSelector from '../components/ProfessionalSelector';
import Logo from '../components/Logo';
import { 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MessageCircle, 
  ArrowLeft, 
  CheckCircle,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SuccessData {
  appointmentId: string;
  clientName: string;
  serviceName: string;
  professionalName: string;
  professionalAvatar?: string;
  startTime: string;
  duration: number;
  businessName: string;
  wasAutoAssigned: boolean;
}

interface BookingState {
  business: { id: string; name: string; slug: string } | null;
  services: Service[];
  professionals: Professional[];
  selectedService: Service | null;
  selectedProfessional: string | null;
  selectedDate: string;
  selectedTime: string | null;
  clientData: {
    name: string;
    email: string;
    phone: string;
    notes: string;
  };
}

const BookingPage: React.FC = () => {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const [booking, setBooking] = useState<BookingState>({
    business: null,
    services: [],
    professionals: [],
    selectedService: null,
    selectedProfessional: null,
    selectedDate: '',
    selectedTime: null,
    clientData: {
      name: '',
      email: '',
      phone: '',
      notes: ''
    }
  });

  useEffect(() => {
    if (businessSlug) {
      loadBusinessData();
    }
  }, [businessSlug]);

  // Cargar profesionales cuando se selecciona servicio y fecha
  useEffect(() => {
    if (booking.selectedService && booking.selectedDate) {
      loadProfessionals();
    }
  }, [booking.selectedService, booking.selectedDate]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const servicesResponse = await bookingService.getServices(businessSlug!);
      
      if (servicesResponse.success) {
        setBooking(prev => ({
          ...prev,
          business: servicesResponse.business,
          services: servicesResponse.services
        }));
      }
    } catch (error) {
      console.error('Error cargando datos del negocio:', error);
      setError('No se pudo cargar la información del negocio');
    } finally {
      setLoading(false);
    }
  };

  const loadProfessionals = async () => {
    if (!booking.selectedService || !booking.selectedDate) return;
    
    try {
      const professionalsResponse = await bookingService.getProfessionals(
        businessSlug!,
        booking.selectedDate,
        booking.selectedService.id
      );
      
      if (professionalsResponse.success) {
        setBooking(prev => ({
          ...prev,
          professionals: professionalsResponse.data.professionals
        }));
      }
    } catch (error) {
      console.error('Error cargando profesionales:', error);
      toast.error('Error cargando profesionales disponibles');
    }
  };

  const handleServiceSelect = (service: Service) => {
    setBooking(prev => ({
      ...prev,
      selectedService: service,
      selectedProfessional: null,
      selectedTime: null,
      professionals: []
    }));
  };

  const handleDateSelect = (date: string) => {
    setBooking(prev => ({
      ...prev,
      selectedDate: date,
      selectedProfessional: null,
      selectedTime: null,
      professionals: []
    }));
  };

  const handleProfessionalSelect = (professionalId: string | null) => {
    setBooking(prev => ({
      ...prev,
      selectedProfessional: professionalId,
      selectedTime: null
    }));
  };

  const handleTimeSelect = (datetime: string) => {
    setBooking(prev => ({
      ...prev,
      selectedTime: datetime
    }));
  };

  const handleClientDataChange = (field: keyof BookingState['clientData'], value: string) => {
    setBooking(prev => ({
      ...prev,
      clientData: {
        ...prev.clientData,
        [field]: value
      }
    }));
  };

  const handleSubmitBooking = async () => {
    if (!booking.selectedService || !booking.selectedDate || !booking.selectedTime) {
      toast.error('Faltan datos requeridos para completar la reserva');
      return;
    }

    if (!booking.clientData.name) {
      toast.error('Por favor ingresa tu nombre');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const bookingData: BookingFormData = {
        clientName: booking.clientData.name,
        clientEmail: booking.clientData.email,
        clientPhone: booking.clientData.phone,
        serviceId: booking.selectedService.id,
        startTime: booking.selectedTime,
        notes: booking.clientData.notes,
        professionalId: booking.selectedProfessional || undefined
      };

      const response = await bookingService.createBooking(businessSlug!, bookingData);

      if (response.success) {
        setSuccessData(response.data);
        setStep(5); // Success step
        toast.success('¡Reserva confirmada exitosamente!');
      }
    } catch (error: unknown) {
      console.error('Error creando reserva:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al crear la reserva. Intenta nuevamente.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const goToNextStep = () => {
    if (step === 1 && booking.selectedService) {
      setStep(2);
    } else if (step === 2 && booking.selectedDate) {
      setStep(3);
    } else if (step === 3 && (booking.selectedProfessional !== null || booking.selectedTime)) {
      setStep(4);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
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

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  // Generate date options (next 30 days)
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('es-ES', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        }),
        isToday: i === 0
      });
    }
    
    return dates;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error && !booking.business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Negocio no encontrado</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo className="h-8" />
              {booking.business && (
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{booking.business.name}</h1>
                  <p className="text-sm text-gray-600">Reserva tu cita en línea</p>
                </div>
              )}
            </div>
            
            {/* Progress indicator */}
            <div className="hidden md:flex items-center space-x-2">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step >= num 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {num}
                  </div>
                  {num < 4 && (
                    <div className={`
                      w-8 h-0.5 mx-2
                      ${step > num ? 'bg-blue-600' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Qué servicio necesitas?</h2>
                <p className="text-gray-600">Elige el servicio que mejor se adapte a tus necesidades</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {booking.services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className={`
                      p-6 rounded-xl border cursor-pointer transition-all duration-200
                      ${booking.selectedService?.id === service.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                      <span className="text-lg font-bold text-blue-600">{formatCurrency(service.price)}</span>
                    </div>
                    {service.description && (
                      <p className="text-gray-600 mb-3">{service.description}</p>
                    )}
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDuration(service.duration)}
                    </div>
                  </div>
                ))}
              </div>

              {booking.selectedService && (
                <div className="mt-8 text-center">
                  <button
                    onClick={goToNextStep}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Continuar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date Selection */}
          {step === 2 && (
            <div className="p-8">
              <div className="flex items-center mb-6">
                <button onClick={goBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Selecciona la fecha</h2>
                  <p className="text-gray-600">¿Cuándo te gustaría agendar tu cita?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
                {generateDateOptions().map((dateOption) => (
                  <button
                    key={dateOption.value}
                    onClick={() => handleDateSelect(dateOption.value)}
                    className={`
                      p-3 rounded-xl text-center transition-colors relative
                      ${booking.selectedDate === dateOption.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                      }
                    `}
                  >
                    <div className="text-sm font-medium">{dateOption.label}</div>
                    {dateOption.isToday && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>

              {booking.selectedDate && (
                <div className="text-center">
                  <button
                    onClick={goToNextStep}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Continuar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Professional Selection */}
          {step === 3 && (
            <div className="p-8">
              <div className="flex items-center mb-6">
                <button onClick={goBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Selecciona profesional y horario</h2>
                  <p className="text-gray-600">
                    Fecha: {new Date(booking.selectedDate).toLocaleDateString('es-ES', { 
                      weekday: 'long', day: 'numeric', month: 'long' 
                    })}
                  </p>
                </div>
              </div>

              <ProfessionalSelector
                professionals={booking.professionals}
                selectedProfessional={booking.selectedProfessional}
                onProfessionalSelect={handleProfessionalSelect}
                selectedDate={booking.selectedDate}
                selectedTime={booking.selectedTime}
                onTimeSelect={handleTimeSelect}
                showTimeSlots={true}
              />

              {(booking.selectedProfessional !== null || booking.selectedTime) && (
                <div className="mt-8 text-center">
                  <button
                    onClick={goToNextStep}
                    disabled={!booking.selectedTime}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Client Information */}
          {step === 4 && (
            <div className="p-8">
              <div className="flex items-center mb-6">
                <button onClick={goBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Tus datos</h2>
                  <p className="text-gray-600">Información necesaria para confirmar tu cita</p>
                </div>
              </div>

              {/* Resumen de la reserva */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">Resumen de tu reserva</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Servicio:</span>
                    <span className="font-medium">{booking.selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha y hora:</span>
                    <span className="font-medium">
                      {booking.selectedTime && formatDateTime(booking.selectedTime).date} - {booking.selectedTime && formatDateTime(booking.selectedTime).time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duración:</span>
                    <span className="font-medium">{booking.selectedService && formatDuration(booking.selectedService.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Precio:</span>
                    <span className="font-bold text-blue-600">{booking.selectedService && formatCurrency(booking.selectedService.price)}</span>
                  </div>
                  {booking.selectedProfessional && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profesional:</span>
                      <span className="font-medium">
                        {booking.professionals.find(p => p.id === booking.selectedProfessional)?.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Formulario de datos del cliente */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={booking.clientData.name}
                    onChange={(e) => handleClientDataChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={booking.clientData.email}
                    onChange={(e) => handleClientDataChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={booking.clientData.phone}
                    onChange={(e) => handleClientDataChange('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageCircle className="w-4 h-4 inline mr-1" />
                    Notas adicionales
                  </label>
                  <textarea
                    value={booking.clientData.notes}
                    onChange={(e) => handleClientDataChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Información adicional que consideres importante..."
                  />
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="mt-8 text-center">
                <button
                  onClick={handleSubmitBooking}
                  disabled={submitting || !booking.clientData.name}
                  className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Confirmando...' : 'Confirmar reserva'}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && successData && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Reserva confirmada!</h2>
              <p className="text-gray-600 mb-8">Tu cita ha sido reservada exitosamente</p>

              <div className="bg-gray-50 rounded-xl p-6 max-w-md mx-auto mb-8">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{successData.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Servicio:</span>
                    <span className="font-medium">{successData.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profesional:</span>
                    <span className="font-medium">
                      {successData.professionalName}
                      {successData.wasAutoAssigned && (
                        <span className="text-xs text-blue-600 ml-1">(asignado automáticamente)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha y hora:</span>
                    <span className="font-medium">
                      {formatDateTime(successData.startTime).date} - {formatDateTime(successData.startTime).time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duración:</span>
                    <span className="font-medium">{formatDuration(successData.duration)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  Te recomendamos guardar esta información para referencia futura.
                  Si necesitas hacer cambios, contacta directamente con {successData.businessName}.
                </p>
                
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Hacer otra reserva
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingPage; 