import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentService, publicService } from '../services/api';
import type { Service } from '../types';
import Logo from '../components/Logo';

interface BookingState {
  business: { id: string; name: string; slug: string } | null;
  services: Service[];
  selectedService: Service | null;
  selectedDate: string;
  selectedTime: string;
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
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const [booking, setBooking] = useState<BookingState>({
    business: null,
    services: [],
    selectedService: null,
    selectedDate: '',
    selectedTime: '',
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

  useEffect(() => {
    if (booking.selectedService && booking.selectedDate) {
      loadAvailableSlots();
    }
  }, [booking.selectedService, booking.selectedDate]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date().toISOString().split('T')[0];
      const bookingData = await appointmentService.getAvailableSlots(businessSlug!, {
        date: today
      });
      
      setBooking(prev => ({
        ...prev,
        business: bookingData.business,
        services: bookingData.services
      }));
    } catch (error) {
      console.error('Error cargando datos del negocio:', error);
      setError('No se pudo cargar la información del negocio');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!booking.selectedService || !booking.selectedDate) return;
    
    try {
      const bookingData = await appointmentService.getAvailableSlots(businessSlug!, {
        date: booking.selectedDate,
        serviceId: booking.selectedService.id
      });
      
      // Formatear los horarios a HH:MM
      const formattedSlots = bookingData.availableSlots.map(slot => {
        const date = new Date(slot.time);
        return date.toTimeString().slice(0, 5); // HH:MM format
      });
      
      setAvailableSlots(formattedSlots);
    } catch (error) {
      console.error('Error cargando horarios:', error);
      setAvailableSlots([]);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setBooking(prev => ({
      ...prev,
      selectedService: service,
      selectedTime: '' // Reset time when service changes
    }));
    setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setBooking(prev => ({
      ...prev,
      selectedDate: date,
      selectedTime: '' // Reset time when date changes
    }));
  };

  const handleTimeSelect = (time: string) => {
    setBooking(prev => ({
      ...prev,
      selectedTime: time
    }));
    setStep(3);
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
      setError('Faltan datos requeridos');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Crear datetime combinando fecha y hora
      const startDateTime = new Date(`${booking.selectedDate}T${booking.selectedTime}`);

      await publicService.bookAppointment(businessSlug!, {
        clientName: booking.clientData.name,
        clientEmail: booking.clientData.email || undefined,
        clientPhone: booking.clientData.phone || undefined,
        serviceId: booking.selectedService.id,
        startTime: startDateTime.toISOString(),
        notes: booking.clientData.notes || undefined
      });

      setStep(4); // Success step
    } catch (error) {
      console.error('Error creando reserva:', error);
      setError('Error al crear la reserva. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error && !booking.business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Negocio no encontrado</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="/" className="btn-primary">Volver al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {booking.business?.name}
          </h1>
          <p className="text-gray-600">
            Reservar Turno Online
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[
              { number: 1, title: 'Servicio' },
              { number: 2, title: 'Fecha y Hora' },
              { number: 3, title: 'Datos' },
              { number: 4, title: 'Confirmación' }
            ].map((stepItem, index) => (
              <div key={stepItem.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= stepItem.number 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > stepItem.number ? '✓' : stepItem.number}
                </div>
                <span className={`ml-2 text-sm ${
                  step >= stepItem.number ? 'text-primary-600 font-medium' : 'text-gray-500'
                }`}>
                  {stepItem.title}
                </span>
                {index < 3 && (
                  <div className={`w-8 h-0.5 ml-4 ${
                    step > stepItem.number ? 'bg-primary-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="card max-w-2xl mx-auto">
          <div className="card-body">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Step 1: Service Selection */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Selecciona un Servicio
                </h2>
                <div className="space-y-4">
                  {booking.services.filter(s => s.isActive).map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service)}
                      className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>⏱️ {formatDuration(service.duration)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(service.price)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Date and Time Selection */}
            {step === 2 && booking.selectedService && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Selecciona Fecha y Hora
                  </h2>
                  <button onClick={goBack} className="btn-secondary text-sm">
                    ← Volver
                  </button>
                </div>

                {/* Selected Service Summary */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{booking.selectedService.name}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDuration(booking.selectedService.duration)} • {formatCurrency(booking.selectedService.price)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={booking.selectedDate}
                    onChange={(e) => handleDateSelect(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Time Selection */}
                {booking.selectedDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horario Disponible
                    </label>
                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {availableSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => handleTimeSelect(time)}
                            className="p-3 text-center border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No hay horarios disponibles para esta fecha
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Client Form */}
            {step === 3 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Datos de Contacto
                  </h2>
                  <button onClick={goBack} className="btn-secondary text-sm">
                    ← Volver
                  </button>
                </div>

                {/* Booking Summary */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Resumen de tu Reserva</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Servicio:</strong> {booking.selectedService?.name}</p>
                    <p><strong>Fecha:</strong> {new Date(booking.selectedDate).toLocaleDateString('es-AR')}</p>
                    <p><strong>Hora:</strong> {booking.selectedTime}</p>
                    <p><strong>Duración:</strong> {booking.selectedService && formatDuration(booking.selectedService.duration)}</p>
                    <p><strong>Precio:</strong> {booking.selectedService && formatCurrency(booking.selectedService.price)}</p>
                  </div>
                </div>

                {/* Client Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={booking.clientData.name}
                      onChange={(e) => handleClientDataChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Tu nombre completo"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={booking.clientData.email}
                      onChange={(e) => handleClientDataChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={booking.clientData.phone}
                      onChange={(e) => handleClientDataChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="+54 9 11 1234-5678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas adicionales
                    </label>
                    <textarea
                      value={booking.clientData.notes}
                      onChange={(e) => handleClientDataChange('notes', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Alguna información adicional..."
                    />
                  </div>

                  <button
                    onClick={handleSubmitBooking}
                    disabled={!booking.clientData.name || submitting}
                    className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Confirmando Reserva...
                      </div>
                    ) : (
                      'Confirmar Reserva'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  ¡Reserva Confirmada!
                </h2>
                <p className="text-gray-600 mb-6">
                  Tu turno ha sido reservado exitosamente. Te contactaremos pronto.
                </p>
                
                <div className="bg-gray-50 p-6 rounded-lg mb-6 text-left">
                  <h3 className="font-medium text-gray-900 mb-3">Detalles de tu Reserva</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Negocio:</strong> {booking.business?.name}</p>
                    <p><strong>Servicio:</strong> {booking.selectedService?.name}</p>
                    <p><strong>Fecha:</strong> {new Date(booking.selectedDate).toLocaleDateString('es-AR')}</p>
                    <p><strong>Hora:</strong> {booking.selectedTime}</p>
                    <p><strong>Cliente:</strong> {booking.clientData.name}</p>
                    {booking.clientData.email && (
                      <p><strong>Email:</strong> {booking.clientData.email}</p>
                    )}
                    {booking.clientData.phone && (
                      <p><strong>Teléfono:</strong> {booking.clientData.phone}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary"
                >
                  Hacer Otra Reserva
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            ¿Eres el dueño de este negocio?{' '}
            <a href="/login" className="text-primary-600 hover:underline">
              Inicia sesión aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingPage; 