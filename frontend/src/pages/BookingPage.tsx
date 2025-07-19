import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle,
  MapPin,
  Phone,
  User,
  Building
} from 'lucide-react';
import { bookingService } from '../services/bookingService';
import { Professional, Service, BookingFormData, UrgencyStats, Branch, PaymentOptions } from '../types/booking';
import ProfessionalSelector from '../components/ProfessionalSelector';
import ClientStarRating from '../components/ClientStarRating';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import Logo from '../components/Logo';
import { toast } from 'react-hot-toast';

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
  requiresPayment?: boolean;
  payment?: {
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint: string;
  };
  price?: number;
}

interface BookingState {
  business: { id: string; name: string; slug: string } | null;
  branches: Branch[];
  selectedBranch: Branch | null;
  services: Service[];
  professionals: Professional[];
  selectedService: Service | null;
  selectedProfessional: string | null;
  selectedDate: string;
  selectedTime: string | null;
  urgency?: UrgencyStats;
  clientData: {
    name: string;
    email: string;
    phone: string;
    notes: string;
  };
  clientScore?: {
    hasScore: boolean;
    starRating: number | null;
    totalBookings: number;
    attendedCount: number;
    noShowCount: number;
    lastActivity?: string;
  } | null;
  paymentOptions?: {
    options: PaymentOptions | null;
    message: string;
    loading: boolean;
  };
  paymentMethod: 'local' | 'online' | null;
}

const BookingPage: React.FC = () => {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [bookingMode, setBookingMode] = useState<'service' | 'professional'>('service');
  const [dateAvailability, setDateAvailability] = useState<Array<{ date: string; available: boolean; slotsCount: number; reason?: string }>>([]);

  const [booking, setBooking] = useState<BookingState>({
    business: null,
    branches: [],
    selectedBranch: null,
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
    },
    paymentOptions: {
      options: null,
      message: '',
      loading: false
    },
    paymentMethod: null
  });

  useEffect(() => {
    if (businessSlug) {
      loadBusinessData();
    }
  }, [businessSlug]);

  useEffect(() => {
    if (bookingMode === 'service' && booking.selectedService && booking.selectedDate) {
      loadProfessionals();
    }
  }, [booking.selectedService, booking.selectedDate, bookingMode]);

  useEffect(() => {
    if (bookingMode === 'professional' && booking.selectedProfessional) {
      loadProfessionalServices();
    }
  }, [booking.selectedProfessional, bookingMode]);

  useEffect(() => {
    if (bookingMode === 'professional' && booking.selectedProfessional && booking.selectedService) {
      loadProfessionalAvailability();
    }
  }, [booking.selectedProfessional, booking.selectedService, bookingMode]);

  useEffect(() => {
    if (step === 4 && bookingMode === 'professional' && booking.selectedProfessional && booking.selectedService && booking.selectedDate) {
      loadSpecificTimeSlots();
    }
  }, [step, bookingMode, booking.selectedProfessional, booking.selectedService, booking.selectedDate]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar sucursales primero
      const branchesResponse = await bookingService.getPublicBranches(businessSlug!);
      
      if (branchesResponse.success) {
        const branches = branchesResponse.data.branches;
        const mainBranch = branches.find(b => b.isMain) || branches[0];
        
        setBooking(prev => ({
          ...prev,
          business: branchesResponse.data.business,
          branches: branches as Branch[],
          selectedBranch: branches.length === 1 ? (mainBranch as Branch) : null // Auto-seleccionar si hay solo una
        }));
        
        // Si hay solo una sucursal, cargar servicios automáticamente
        if (branches.length === 1) {
          const servicesResponse = await bookingService.getServices(businessSlug!);
          
          if (servicesResponse.success) {
            setBooking(prev => ({
              ...prev,
              services: servicesResponse.services
            }));
          }
          
          // Cargar profesionales de la sucursal seleccionada
          const professionalsResponse = await bookingService.getAllProfessionals(
            businessSlug!,
            mainBranch.id
          );
          
          if (professionalsResponse.success) {
            setBooking(prev => ({
              ...prev,
              professionals: professionalsResponse.data.professionals
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos del negocio:', error);
      setError('No se pudo cargar la información del negocio');
    } finally {
      setLoading(false);
    }
  };

  const loadAllProfessionals = async () => {
    try {
      const professionalsResponse = await bookingService.getAllProfessionals(
        businessSlug!,
        booking.selectedBranch?.id
      );
      
      if (professionalsResponse.success) {
        setBooking(prev => ({
          ...prev,
          professionals: professionalsResponse.data.professionals
        }));
      }
    } catch (error) {
      console.error('Error cargando profesionales:', error);
    }
  };

  const loadProfessionalServices = async () => {
    if (!booking.selectedProfessional) return;
    
    try {
      const servicesResponse = await bookingService.getProfessionalServices(
        businessSlug!,
        booking.selectedProfessional
      );
      
      if (servicesResponse.success) {
        const professionalServices = booking.services.filter(service =>
          servicesResponse.data.serviceIds.includes(service.id)
        );
        
        setBooking(prev => ({
          ...prev,
          services: professionalServices
        }));
      }
    } catch (error) {
      console.error('Error cargando servicios del profesional:', error);
      toast.error('Error cargando servicios disponibles');
    }
  };

  const loadProfessionals = async () => {
    if (!booking.selectedService || !booking.selectedDate) return;
    
    try {
      const professionalsResponse = await bookingService.getProfessionals(
        businessSlug!,
        booking.selectedDate,
        booking.selectedService.id,
        booking.selectedBranch?.id
      );
      
      if (professionalsResponse.success) {
        setBooking(prev => ({
          ...prev,
          professionals: professionalsResponse.data.professionals,
          urgency: professionalsResponse.data.urgency
        }));
      }
    } catch (error) {
      console.error('Error cargando profesionales:', error);
      toast.error('Error cargando profesionales disponibles');
    }
  };

  const loadProfessionalAvailability = async () => {
    if (!booking.selectedProfessional || !booking.selectedService) return;
    
    console.log('🔍 Cargando disponibilidad para:', {
      professional: booking.selectedProfessional,
      service: booking.selectedService.id,
      businessSlug
    });
    
    try {
      const availabilityResponse = await bookingService.getProfessionalAvailability(
        businessSlug!,
        booking.selectedProfessional,
        booking.selectedService.id
      );
      
      console.log('📅 Respuesta de disponibilidad:', availabilityResponse);
      
      if (availabilityResponse.success) {
        setDateAvailability(availabilityResponse.data.availability);
        console.log('✅ Disponibilidad cargada:', availabilityResponse.data.availability);
      }
    } catch (error) {
      console.error('❌ Error cargando disponibilidad del profesional:', error);
      toast.error('Error cargando disponibilidad');
    }
  };

  const loadProfessionalAvailabilityDirect = async (professionalId: string, serviceId: string) => {
    try {
      const availabilityResponse = await bookingService.getProfessionalAvailability(
        businessSlug!,
        professionalId,
        serviceId
      );
      
      if (availabilityResponse.success) {
        setDateAvailability(availabilityResponse.data.availability);
      }
    } catch (error) {
      console.error('❌ DIRECT - Error cargando disponibilidad:', error);
      toast.error('Error cargando disponibilidad');
    }
  };

  const loadSpecificTimeSlots = async () => {
    if (!booking.selectedProfessional || !booking.selectedService || !booking.selectedDate) return;
    
    try {
      const professionalsResponse = await bookingService.getProfessionals(
        businessSlug!,
        booking.selectedDate,
        booking.selectedService.id,
        booking.selectedBranch?.id
      );
      
      if (professionalsResponse.success) {
        const specificProfessional = professionalsResponse.data.professionals.find(
          p => p.id === booking.selectedProfessional
        );
        
        if (specificProfessional) {
          setBooking(prev => ({
            ...prev,
            professionals: [specificProfessional],
            urgency: professionalsResponse.data.urgency
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error cargando horarios específicos:', error);
      toast.error('Error cargando horarios disponibles');
    }
  };

  const handleBranchSelect = async (branch: Branch) => {
    setBooking(prev => ({
      ...prev,
      selectedBranch: branch,
      selectedService: null,
      selectedProfessional: null,
      selectedDate: '',
      selectedTime: null,
      professionals: [],
      services: []
    }));

    // Cargar servicios y profesionales de la sucursal seleccionada
    try {
      const servicesResponse = await bookingService.getServices(businessSlug!);
      
      if (servicesResponse.success) {
        setBooking(prev => ({
          ...prev,
          services: servicesResponse.services
        }));
      }

      await loadAllProfessionals();
    } catch (error) {
      console.error('Error cargando datos de la sucursal:', error);
      toast.error('Error cargando servicios de la sucursal');
    }
  };

  const handleModeChange = (mode: 'service' | 'professional') => {
    setBookingMode(mode);
    setBooking(prev => ({
      ...prev,
      selectedService: null,
      selectedProfessional: null,
      selectedDate: '',
      selectedTime: null,
      professionals: []
    }));
    if (mode === 'service') {
      loadBusinessData();
    } else {
      // Solo cargar profesionales si ya hay una sucursal seleccionada
      if (booking.selectedBranch) {
        loadAllProfessionals();
      }
    }
  };

  const handleServiceSelect = (service: Service) => {
    setBooking(prev => ({
      ...prev,
      selectedService: service,
      selectedProfessional: bookingMode === 'service' ? null : prev.selectedProfessional,
      selectedTime: null,
      professionals: bookingMode === 'service' ? [] : prev.professionals
    }));
    
    // Si estamos en modo profesional y tenemos profesional, cargar disponibilidad inmediatamente
    if (bookingMode === 'professional' && booking.selectedProfessional) {
      loadProfessionalAvailabilityDirect(booking.selectedProfessional, service.id);
    }
  };

  const handleDateSelect = (date: string) => {
    setBooking(prev => ({
      ...prev,
      selectedDate: date,
      // En modo profesional mantener el profesional, en modo servicio limpiarlo
      selectedProfessional: bookingMode === 'professional' ? prev.selectedProfessional : null,
      selectedTime: null,
      // En modo profesional mantener la lista de profesionales, en modo servicio limpiarla
      professionals: bookingMode === 'professional' ? prev.professionals : []
    }));
  };

  const handleProfessionalSelect = (professionalId: string | null) => {
    setBooking(prev => {
      const newState = {
      ...prev,
      selectedProfessional: professionalId,
      selectedTime: null
      };
      return newState;
    });
    
    // Si estamos en modo profesional y tenemos servicio, cargar disponibilidad inmediatamente
    if (bookingMode === 'professional' && booking.selectedService && professionalId) {
      setTimeout(() => {
        loadProfessionalAvailabilityDirect(professionalId, booking.selectedService!.id);
      }, 100);
    }
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
      clientData: { ...prev.clientData, [field]: value }
    }));
    
    // Si es email o teléfono, cargar scoring del cliente y opciones de pago
    if ((field === 'email' || field === 'phone') && value.length > 3) {
      loadClientScore(field === 'email' ? value : null, field === 'phone' ? value : null);
      loadPaymentOptions(field === 'email' ? value : null, field === 'phone' ? value : null);
    }
  };

  const loadClientScore = async (email: string | null, phone: string | null) => {
    if (!email && !phone) return;
    
    try {
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (phone) params.append('phone', phone);
      
      const response = await fetch(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setBooking(prev => ({
          ...prev,
          clientScore: data.data
        }));
      }
    } catch (error) {
      console.error('Error cargando scoring del cliente:', error);
      // No mostrar error al usuario, solo no mostrar scoring
    }
  };

  const loadPaymentOptions = async (email: string | null, phone: string | null) => {
    if (!email && !phone) return;
    
    // Solo evaluar opciones de pago si hay datos suficientes
    const currentData = booking.clientData;
    const hasEmail = email || currentData.email;
    const hasPhone = phone || currentData.phone;
    
    if (!hasEmail && !hasPhone) return;
    
    try {
      // Establecer loading
      setBooking(prev => ({
        ...prev,
        paymentOptions: {
          ...prev.paymentOptions!,
          loading: true
        }
      }));

      const paymentOptionsResponse = await bookingService.getPaymentOptions(
        hasEmail || undefined, 
        hasPhone || undefined
      );

      if (paymentOptionsResponse.success) {
        setBooking(prev => ({
          ...prev,
          paymentOptions: {
            options: paymentOptionsResponse.data.paymentOptions,
            message: paymentOptionsResponse.data.message,
            loading: false
          },
          // Si requiere pago, pre-seleccionar online
          paymentMethod: paymentOptionsResponse.data.paymentOptions.requiresPayment ? 'online' : null
        }));
      }
    } catch (error) {
      console.error('Error cargando opciones de pago:', error);
      setBooking(prev => ({
        ...prev,
        paymentOptions: {
          options: null,
          message: 'Error evaluando opciones de pago',
          loading: false
        }
      }));
    }
  };

  const handlePaymentMethodSelect = (method: 'local' | 'online') => {
    setBooking(prev => ({
      ...prev,
      paymentMethod: method
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

      // Usar la fecha y hora seleccionada directamente
      const selectedDateTime = new Date(booking.selectedTime);

      const bookingData: BookingFormData = {
        clientName: booking.clientData.name,
        clientEmail: booking.clientData.email,
        clientPhone: booking.clientData.phone,
        serviceId: booking.selectedService.id,
        startTime: selectedDateTime.toISOString(),
        notes: booking.clientData.notes,
        professionalId: booking.selectedProfessional || undefined,
        paymentMethod: booking.paymentMethod || 'local'
      };

      const response = await bookingService.createBooking(businessSlug!, bookingData);

      if (response.success) {
        const responseData = response.data as SuccessData;
        
        // Si requiere pago, redirigir a MercadoPago
        if (responseData.requiresPayment && responseData.payment) {
          const initPoint = process.env.NODE_ENV === 'production' 
            ? responseData.payment.initPoint 
            : responseData.payment.sandboxInitPoint;
            
          toast.success('Redirigiendo al pago...');
          
          // Pequeño delay para mostrar el mensaje
          setTimeout(() => {
            window.location.href = initPoint;
          }, 1000);
          
          return;
        }
        
        // Reserva confirmada sin pago
        setSuccessData(responseData);
        setStep(5);
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
    if (step === 1 && ((bookingMode === 'service' && booking.selectedService) || (bookingMode === 'professional' && booking.selectedProfessional))) {
      setStep(2);
    } else if (step === 2) {
      if (bookingMode === 'service' && booking.selectedDate) {
        setStep(3);
      } else if (bookingMode === 'professional' && booking.selectedService) {
        setStep(3);
      }
    } else if (step === 3 && bookingMode === 'professional' && booking.selectedDate) {
      setStep(4);
    } else if ((step === 3 && bookingMode === 'service') || (step === 4 && bookingMode === 'professional')) {
      if (booking.selectedTime) {
        setStep(bookingMode === 'service' ? 4 : 5);
      }
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

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const availabilityInfo = dateAvailability.find(d => d.date === dateString);
      
      // En modo profesional, solo incluir fechas disponibles
      // En modo servicio, incluir todas las fechas
      const shouldInclude = bookingMode === 'service' || 
                           (bookingMode === 'professional' && (availabilityInfo?.available === true));
      
      if (shouldInclude) {
        dates.push({
          value: dateString,
          label: date.toLocaleDateString('es-ES', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
          }),
          isToday: i === 0,
          available: availabilityInfo?.available ?? true,
          slotsCount: availabilityInfo?.slotsCount ?? 0,
          reason: availabilityInfo?.reason
        });
      }
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
          
          {step === 1 && (
            <div className="p-4 md:p-8">
              {/* Selección de Sucursal (solo si hay más de una) */}
              {booking.branches.length > 1 && !booking.selectedBranch && (
                <div>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Selecciona una sucursal</h2>
                    <p className="text-gray-600 text-sm md:text-base">¿En qué ubicación te gustaría ser atendido?</p>
                  </div>

                  <div className="grid gap-4 md:gap-6 max-w-2xl mx-auto">
                    {booking.branches.map((branch) => (
                      <div
                        key={branch.id}
                        onClick={() => handleBranchSelect(branch)}
                        className="rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 border-gray-200 bg-white overflow-hidden"
                      >
                        {/* Banner de la sucursal */}
                        {branch.banner && (
                          <div className="h-32 md:h-40 bg-gray-100 overflow-hidden">
                            <img
                              src={branch.banner}
                              alt={branch.bannerAlt || `Imagen de ${branch.name}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Si falla la carga de la imagen, ocultar el contenedor
                                e.currentTarget.parentElement!.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Contenido de la sucursal */}
                        <div className="p-4 md:p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900 text-base md:text-lg">{branch.name}</h3>
                                {branch.isMain && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                    Principal
                                  </span>
                                )}
                              </div>
                              
                              {branch.address && (
                                <div className="flex items-center text-gray-600 text-sm md:text-base mt-1">
                                  <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                                  <span>{branch.address}</span>
                                </div>
                              )}
                              
                              {branch.phone && (
                                <div className="flex items-center text-gray-600 text-sm md:text-base mt-1">
                                  <Phone className="w-4 h-4 mr-1 flex-shrink-0" />
                                  <span>{branch.phone}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center text-gray-500 text-sm mt-2">
                                <User className="w-4 h-4 mr-1" />
                                <span>{branch.professionalCount} profesionales disponibles</span>
                              </div>
                              
                              {branch.description && (
                                <p className="text-gray-600 text-sm mt-2">{branch.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contenido principal cuando hay sucursal seleccionada o solo una sucursal */}
              {(booking.selectedBranch || booking.branches.length === 1) && (
                <div>
                  {/* Mostrar sucursal seleccionada si hay múltiples */}
                  {booking.branches.length > 1 && booking.selectedBranch && (
                    <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building className="w-5 h-5 text-blue-600" />
                          <div>
                            <h4 className="font-medium text-blue-900">{booking.selectedBranch.name}</h4>
                            {booking.selectedBranch.address && (
                              <p className="text-sm text-blue-700">{booking.selectedBranch.address}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setBooking(prev => ({ ...prev, selectedBranch: null }))}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Cambiar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">¿Cómo prefieres reservar?</h2>
                    <p className="text-gray-600 text-sm md:text-base">Elige la forma que más te convenga</p>
                  </div>

              <div className="flex bg-gray-100 rounded-xl p-1 mb-8 max-w-md mx-auto">
                <button
                  onClick={() => handleModeChange('service')}
                  className={`
                    flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200
                    ${bookingMode === 'service'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  Por Servicio
                </button>
                <button
                  onClick={() => handleModeChange('professional')}
                  className={`
                    flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200
                    ${bookingMode === 'professional'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  Por Profesional
                </button>
              </div>

              {bookingMode === 'service' && (
                <div>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">¿Qué servicio necesitas?</h3>
                    <p className="text-gray-600 text-sm">Selecciona el servicio que más te convenga</p>
                  </div>

                  <div className="grid gap-4 md:gap-6 max-w-2xl mx-auto">
                    {booking.services.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className={`
                          p-4 md:p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg min-h-[80px] md:min-h-[100px]
                          ${booking.selectedService?.id === service.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-base md:text-lg">{service.name}</h3>
                            {service.description && (
                              <p className="text-gray-600 text-sm md:text-base mt-1">{service.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-3">
                              <span className="text-blue-600 font-medium text-sm md:text-base">
                                {formatCurrency(service.price)}
                              </span>
                              <span className="text-gray-500 text-sm md:text-base">
                                {formatDuration(service.duration)}
                              </span>
                            </div>
                          </div>
                          {booking.selectedService?.id === service.id && (
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-white"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bookingMode === 'professional' && (
                <div>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">¿Con qué profesional prefieres?</h3>
                    <p className="text-gray-600 text-sm">Selecciona tu profesional de confianza</p>
                  </div>

                  <div className="grid gap-4 md:gap-6 max-w-2xl mx-auto">
                    {booking.professionals.map((professional) => (
                      <div
                        key={professional.id}
                        onClick={() => handleProfessionalSelect(professional.id)}
                        className={`
                          p-4 md:p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg min-h-[80px] md:min-h-[100px]
                          ${booking.selectedProfessional === professional.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {professional.avatar ? (
                              <img
                                src={professional.avatar}
                                alt={professional.name}
                                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-600 font-medium text-lg md:text-xl">
                                  {professional.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-base md:text-lg">{professional.name}</h3>
                              {professional.specialties && professional.specialties.length > 0 && (
                                <p className="text-gray-600 text-sm md:text-base mt-1">
                                  {professional.specialties.join(', ')}
                                </p>
                              )}
                              {professional.rating && (
                                <div className="flex items-center mt-2">
                                  <span className="text-yellow-500 text-sm">⭐</span>
                                  <span className="text-gray-600 text-sm ml-1">{professional.rating}/5</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {booking.selectedProfessional === professional.id && (
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-white"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                  {((bookingMode === 'service' && booking.selectedService) || 
                    (bookingMode === 'professional' && booking.selectedProfessional)) && (
                    <div className="text-center mt-8">
                      <button
                        onClick={goToNextStep}
                        className="px-8 py-4 md:px-12 md:py-5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-base md:text-lg min-h-[56px] w-full sm:w-auto"
                      >
                        Continuar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="p-4 md:p-8">
              <div className="flex items-center mb-6">
                <button onClick={goBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div>
                  {bookingMode === 'service' ? (
                    <>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">¿Cuándo te conviene?</h2>
                      <p className="text-gray-600 text-sm md:text-base">
                        Servicio: {booking.selectedService?.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">¿Qué servicio necesitas?</h2>
                      <p className="text-gray-600 text-sm md:text-base">
                        Profesional: {booking.professionals.find(p => p.id === booking.selectedProfessional)?.name}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {bookingMode === 'service' && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
                    {generateDateOptions().map((dateOption) => (
                      <button
                        key={dateOption.value}
                        onClick={() => handleDateSelect(dateOption.value)}
                        className={`
                          p-3 md:p-4 rounded-xl text-center transition-colors relative min-h-[64px] md:min-h-[72px]
                          ${booking.selectedDate === dateOption.value
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                          }
                        `}
                      >
                        <div className="text-sm md:text-base font-medium">{dateOption.label}</div>
                        {dateOption.isToday && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>

                  {booking.selectedDate && (
                    <div className="text-center">
                      <button
                        onClick={goToNextStep}
                        className="px-8 py-4 md:px-12 md:py-5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-base md:text-lg min-h-[56px] w-full sm:w-auto"
                      >
                        Continuar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {bookingMode === 'professional' && (
                <div>
                  <div className="grid gap-4 md:gap-6 max-w-2xl mx-auto">
                    {booking.services.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className={`
                          p-4 md:p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg min-h-[80px] md:min-h-[100px]
                          ${booking.selectedService?.id === service.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-base md:text-lg">{service.name}</h3>
                            {service.description && (
                              <p className="text-gray-600 text-sm md:text-base mt-1">{service.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-3">
                              <span className="text-blue-600 font-medium text-sm md:text-base">
                                {formatCurrency(service.price)}
                              </span>
                              <span className="text-gray-500 text-sm md:text-base">
                                {formatDuration(service.duration)}
                              </span>
                            </div>
                          </div>
                          {booking.selectedService?.id === service.id && (
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-white"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {booking.selectedService && (
                    <div className="text-center mt-8">
                      <button
                        onClick={goToNextStep}
                        className="px-8 py-4 md:px-12 md:py-5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-base md:text-lg min-h-[56px] w-full sm:w-auto"
                      >
                        Continuar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && bookingMode === 'professional' && (
            <div className="p-4 md:p-8">
              <div className="flex items-center mb-6">
                <button onClick={goBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">¿Qué fecha te conviene?</h2>
                  <p className="text-gray-600 text-sm md:text-base">
                    Servicio: {booking.selectedService?.name}
                  </p>
                </div>
              </div>

              <div className="flex justify-center items-center space-x-6 mb-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Disponible</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>Pocos horarios</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                  <span>Sin disponibilidad</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
                {generateDateOptions().map((dateOption) => {
                  let colorClass = 'bg-gray-50 hover:bg-gray-100 text-gray-900';
                  
                  if (booking.selectedDate === dateOption.value) {
                    colorClass = 'bg-blue-600 text-white shadow-md';
                  } else if (dateOption.available && dateOption.slotsCount > 3) {
                    colorClass = 'bg-green-100 hover:bg-green-200 text-green-800 border-2 border-green-400';
                  } else if (dateOption.available && dateOption.slotsCount > 0) {
                    colorClass = 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-2 border-yellow-400';
                  } else if (!dateOption.available) {
                    colorClass = 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60';
                  }

                  return (
                    <button
                      key={dateOption.value}
                      onClick={() => handleDateSelect(dateOption.value)}
                      className={`p-3 md:p-4 rounded-xl text-center transition-colors relative min-h-[64px] md:min-h-[72px] ${colorClass}`}
                      disabled={!dateOption.available}
                    >
                      <div className="text-sm md:text-base font-medium">{dateOption.label}</div>
                      {dateOption.available && dateOption.slotsCount > 0 && (
                        <div className="text-xs mt-1 opacity-75">
                          {dateOption.slotsCount} horarios
                        </div>
                      )}
                      {!dateOption.available && (
                        <div className="text-xs mt-1 opacity-75">
                          Sin horarios
                        </div>
                      )}
                      {dateOption.isToday && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              {booking.selectedDate && (
                <div className="text-center">
                  <button
                    onClick={goToNextStep}
                    className="px-8 py-4 md:px-12 md:py-5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-base md:text-lg min-h-[56px] w-full sm:w-auto"
                  >
                    Continuar
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && bookingMode === 'service' && (
            <div className="p-4 md:p-8">
              <div className="flex items-center mb-6 px-0">
                <button onClick={goBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Selecciona profesional y horario</h2>
                  <p className="text-gray-600 text-sm md:text-base">
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
                urgency={booking.urgency}
                hideSelection={false}
              />

              {booking.selectedTime && (
                <div className="mt-8 text-center px-4">
                  <button
                    onClick={goToNextStep}
                    disabled={!booking.selectedTime}
                    className="px-8 py-4 md:px-12 md:py-5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg min-h-[56px] w-full sm:w-auto"
                  >
                    Continuar
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 4 && bookingMode === 'professional' && (
            <div className="p-4 md:p-8">
              <div className="flex items-center mb-6 px-0">
                <button onClick={goBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Selecciona horario</h2>
                  <p className="text-gray-600 text-sm md:text-base">
                    {booking.professionals.find(p => p.id === booking.selectedProfessional)?.name} - {booking.selectedService?.name}
                  </p>
                </div>
              </div>

              <ProfessionalSelector
                professionals={booking.professionals.filter(p => p.id === booking.selectedProfessional)}
                selectedProfessional={booking.selectedProfessional}
                onProfessionalSelect={() => {}}
                selectedDate={booking.selectedDate}
                selectedTime={booking.selectedTime}
                onTimeSelect={handleTimeSelect}
                showTimeSlots={true}
                urgency={booking.urgency}
                hideSelection={true}
              />

              {booking.selectedTime && (
                <div className="mt-8 text-center px-4">
                  <button
                    onClick={goToNextStep}
                    disabled={!booking.selectedTime}
                    className="px-8 py-4 md:px-12 md:py-5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg min-h-[56px] w-full sm:w-auto"
                  >
                    Continuar
                  </button>
                </div>
              )}
            </div>
          )}

          {((step === 4 && bookingMode === 'service') || (step === 5 && bookingMode === 'professional')) && (
            <div className="p-4 md:p-8">
              <div className="flex items-center mb-6">
                <button onClick={goBack} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Tus datos</h2>
                  <p className="text-gray-600 text-sm md:text-base">Información necesaria para confirmar tu cita</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 md:p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4 text-base md:text-lg">Resumen de tu reserva</h3>
                <div className="space-y-3 text-sm md:text-base">
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
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Precio:</span>
                    <span className="font-bold text-blue-600 text-lg md:text-xl">{booking.selectedService && formatCurrency(booking.selectedService.price)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={booking.clientData.name}
                    onChange={(e) => handleClientDataChange('name', e.target.value)}
                    className="w-full px-4 py-4 md:px-6 md:py-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-lg min-h-[56px]"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={booking.clientData.email}
                    onChange={(e) => handleClientDataChange('email', e.target.value)}
                    className="w-full px-4 py-4 md:px-6 md:py-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-lg min-h-[56px]"
                    placeholder="tu@email.com"
                  />
                  {booking.clientScore?.hasScore && (
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Historial del cliente:</span>
                      <ClientStarRating
                        starRating={booking.clientScore.starRating}
                        totalBookings={booking.clientScore.totalBookings}
                        attendedCount={booking.clientScore.attendedCount}
                        noShowCount={booking.clientScore.noShowCount}
                        showDetails={true}
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={booking.clientData.phone}
                    onChange={(e) => handleClientDataChange('phone', e.target.value)}
                    className="w-full px-4 py-4 md:px-6 md:py-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-lg min-h-[56px]"
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-700 mb-2">
                    Notas adicionales
                  </label>
                  <textarea
                    value={booking.clientData.notes}
                    onChange={(e) => handleClientDataChange('notes', e.target.value)}
                    className="w-full px-4 py-4 md:px-6 md:py-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-lg min-h-[80px] resize-none"
                    placeholder="Información adicional que quieras compartir..."
                    rows={3}
                  />
                </div>

                {/* Opciones de Pago */}
                {booking.selectedService && (booking.clientData.email || booking.clientData.phone) && (
                  <div className="mt-6">
                    <PaymentMethodSelector
                      paymentOptions={booking.paymentOptions?.options || null}
                      message={booking.paymentOptions?.message || ''}
                      selectedMethod={booking.paymentMethod}
                      onMethodSelect={handlePaymentMethodSelect}
                      servicePrice={booking.selectedService.price}
                      isLoading={booking.paymentOptions?.loading || false}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm md:text-base">{error}</p>
                </div>
              )}

              <div className="mt-8 text-center">
                <button
                  onClick={handleSubmitBooking}
                  disabled={submitting || !booking.clientData.name || 
                    (booking.paymentOptions?.options && !booking.paymentMethod)}
                  className="px-8 py-4 md:px-12 md:py-5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg min-h-[56px] w-full sm:w-auto"
                >
                  {submitting ? 'Confirmando...' : booking.paymentMethod === 'online' ? 'Proceder al pago' : 'Confirmar reserva'}
                </button>
              </div>
            </div>
          )}

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