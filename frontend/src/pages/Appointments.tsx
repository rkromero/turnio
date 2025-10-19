import React, { useState, useEffect } from 'react';
import { appointmentService, serviceService } from '../services/api';
import { userService } from '../services/userService';
import type { Appointment, Service, AppointmentForm } from '../types';
import AppointmentModal from '../components/AppointmentModal';
import ClientStarRating from '../components/ClientStarRating';
import FloatingActionButton from '../components/FloatingActionButton';
import CalendarView from '../components/CalendarView';
import DayView from '../components/DayView';
import PlanLimitModal, { PlanLimitDetails } from '../components/PlanLimitModal';
import { useIsMobileSimple } from '../hooks/useIsMobile';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  DollarSign,
  MoreVertical,
  Filter,
  X,
  Edit3,
  List,
  CalendarDays
} from 'lucide-react';

interface AppointmentWithScoring extends Appointment {
  clientScore?: {
    hasScore: boolean;
    starRating: number | null;
    totalBookings: number;
    attendedCount: number;
    noShowCount: number;
  };
}

interface Professional {
  id: string;
  name: string;
  email: string;
}

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentWithScoring[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'day'>('day');
  const [filters, setFilters] = useState({
    date: '',
    status: '',
    serviceId: ''
  });
  const [showPlanLimitModal, setShowPlanLimitModal] = useState(false);
  const [planLimitData, setPlanLimitData] = useState<PlanLimitDetails | null>(null);
  const [showLowScoringWarning, setShowLowScoringWarning] = useState(false);
  const [lowScoringData, setLowScoringData] = useState<any>(null);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<AppointmentForm | null>(null);
  const [initialDateTime, setInitialDateTime] = useState<{ date: string; time: string } | null>(null);
  const isMobile = useIsMobileSimple();

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadClientScoring = async (appointments: Appointment[]): Promise<AppointmentWithScoring[]> => {
    return Promise.all(
      appointments.map(async (appointment) => {
        try {
          if (appointment.client?.email || appointment.client?.phone) {
            const params = new URLSearchParams();
            if (appointment.client.email) params.append('email', appointment.client.email);
            if (appointment.client.phone) params.append('phone', appointment.client.phone);
            
            const response = await fetch(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?${params.toString()}`);
            const scoreData = await response.json();
            
            if (scoreData.success) {
              return {
                ...appointment,
                clientScore: scoreData.data
              };
            }
          }
          return appointment;
        } catch (error) {
          console.error('Error cargando scoring para cita:', error);
          return appointment;
        }
      })
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [appointmentsData, servicesData, usersData] = await Promise.all([
        appointmentService.getAppointments(filters),
        serviceService.getServices(),
        userService.getUsers({ includeInactive: false })
      ]);
      
      // Cargar scoring para cada cita
      const appointmentsWithScoring = await loadClientScoring(appointmentsData);
      
      // Filtrar solo usuarios activos para el selector
      const activeProfessionals = usersData
        .filter(user => user.isActive)
        .map(user => ({
          id: user.id,
          name: user.name,
          email: user.email
        }));
      
      setAppointments(appointmentsWithScoring);
      setServices(servicesData);
      setProfessionals(activeProfessionals);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = (date?: string, time?: string) => {
    setEditingAppointment(null);
    
    // Si se proporciona fecha y/u hora, guardarlos para pre-cargar el modal
    if (date || time) {
      setInitialDateTime({ 
        date: date || '', 
        time: time || '' 
      });
    } else {
      setInitialDateTime(null);
    }
    
    setIsModalOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleSubmitAppointment = async (data: AppointmentForm, ignoreScoreWarning = false) => {
    try {
      setIsSubmitting(true);
      
      // Agregar flag de ignorar advertencia si es necesario
      const submitData = ignoreScoreWarning ? { ...data, ignoreScoreWarning: true } : data;
      
      if (editingAppointment) {
        await appointmentService.updateAppointment(editingAppointment.id, submitData);
        toast.success('Cita actualizada exitosamente');
      } else {
        await appointmentService.createAppointment(submitData);
        toast.success('Cita creada exitosamente');
      }
      
      await loadData();
      setIsModalOpen(false);
      setEditingAppointment(null);
      setShowLowScoringWarning(false);
      setPendingAppointmentData(null);
    } catch (error: unknown) {
      console.error('Error guardando cita:', error);
      
      // Verificar si es un error de scoring bajo
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string; message?: string; clientScoring?: any; details?: PlanLimitDetails } } };
        
        // Manejar advertencia de scoring bajo
        if (axiosError.response?.data?.error === 'LOW_SCORING_WARNING') {
          setLowScoringData(axiosError.response.data);
          setPendingAppointmentData(data);
          setShowLowScoringWarning(true);
          setIsModalOpen(false);
          return; // No lanzar error, solo mostrar diálogo
        }
        
        // Manejar límite de plan
        if (axiosError.response?.data?.error === 'PLAN_LIMIT_EXCEEDED') {
          const details = axiosError.response.data.details;
          if (details) {
            setPlanLimitData(details);
            setShowPlanLimitModal(true);
            setIsModalOpen(false);
          }
        } else {
          const message = axiosError.response?.data?.message || (error instanceof Error ? error.message : 'Error guardando cita');
          toast.error(message);
        }
      } else {
        const message = error instanceof Error ? error.message : 'Error guardando cita';
        toast.error(message);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmLowScoring = async () => {
    if (pendingAppointmentData) {
      await handleSubmitAppointment(pendingAppointmentData, true);
    }
  };

  const handleCancelLowScoring = () => {
    setShowLowScoringWarning(false);
    setLowScoringData(null);
    setPendingAppointmentData(null);
    toast('Creación de cita cancelada', { icon: 'ℹ️' });
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      // Encontrar la cita para obtener datos del cliente
      const appointment = appointments.find(apt => apt.id === appointmentId);
      
      await appointmentService.updateAppointment(appointmentId, { 
        status: newStatus as 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED' 
      });

      // Registrar evento de scoring automáticamente
      if (appointment?.client && (appointment.client.email || appointment.client.phone)) {
        try {
          let eventType = '';
          let notes = '';
          
          switch (newStatus) {
            case 'COMPLETED':
              eventType = 'ATTENDED';
              notes = 'Cita completada exitosamente';
              break;
            case 'NO_SHOW':
              eventType = 'NO_SHOW';
              notes = 'Cliente no se presentó a la cita';
              break;
            case 'CANCELLED':
              eventType = 'CANCELLED_LATE';
              notes = 'Cita cancelada';
              break;
          }

          if (eventType) {
            const scoringData = {
              email: appointment.client.email || null,
              phone: appointment.client.phone || null,
              clientName: appointment.client.name,
              eventType,
              eventDate: new Date().toISOString(),
              appointmentId: appointmentId,
              notes
            };

            await fetch('https://turnio-backend-production.up.railway.app/api/client-scoring/event/auto', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(scoringData)
            });

            console.log(`✅ Evento de scoring registrado: ${eventType} para ${appointment.client.name}`);
          }
        } catch (scoringError) {
          console.error('Error registrando evento de scoring:', scoringError);
          // No bloqueamos el flujo principal si falla el scoring
        }
      }

      await loadData();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error al actualizar el estado de la cita');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NO_SHOW': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      CONFIRMED: 'Confirmado',
      COMPLETED: 'Completado',
      CANCELLED: 'Cancelado',
      NO_SHOW: 'No asistió'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      weekday: isMobile ? 'short' : 'long',
      year: 'numeric',
      month: isMobile ? 'short' : 'long',
      day: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments.filter(apt => 
      new Date(apt.startTime) > now && apt.status === 'CONFIRMED'
    );
  };

  const getTodayAppointments = () => {
    const today = new Date().toDateString();
    return appointments.filter(apt => 
      new Date(apt.startTime).toDateString() === today
    );
  };

  const clearFilters = () => {
    setFilters({ date: '', status: '', serviceId: '' });
    setShowFilters(false);
  };

  const hasActiveFilters = filters.date || filters.status || filters.serviceId;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="loading-spinner-mobile mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando citas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header - Optimizado para móvil */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {isMobile ? 'Turnos' : 'Citas y Turnos'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {isMobile ? 'Gestiona tus citas' : 'Gestiona todas las citas de tu negocio'}
            </p>
          </div>
          
          {/* Toggle de Vista - Entre stats y filtros */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
                <span>{isMobile ? 'Lista' : 'Lista'}</span>
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'day'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>{isMobile ? 'Día' : 'Día'}</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>{isMobile ? 'Mes' : 'Mes'}</span>
              </button>
            </div>

            {/* Desktop: Botón crear (movido aquí) */}
            {!isMobile && (
              <button onClick={() => handleCreateAppointment()} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Cita
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards - Grid responsive */}
        <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-6">
          <div className="stats-card overflow-hidden">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-2 md:ml-3 min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">
                  Hoy
                </p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900 truncate">
                  {getTodayAppointments().length}
                </p>
              </div>
            </div>
          </div>

          <div className="stats-card overflow-hidden">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="ml-2 md:ml-3 min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">
                  Próximas
                </p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900 truncate">
                  {getUpcomingAppointments().length}
                </p>
              </div>
            </div>
          </div>

          <div className="stats-card overflow-hidden">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="ml-2 md:ml-3 min-w-0 flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Total</p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900 truncate">
                  {appointments.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros - Responsive (solo mostrar en vista lista o si están activos) */}
        {(viewMode === 'list' && (showFilters || !isMobile)) && (
          <div className="card">
            <div className="card-body">
              {isMobile && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Fecha</label>
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Estado</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Todos los estados</option>
                    <option value="CONFIRMED">Confirmado</option>
                    <option value="COMPLETED">Completado</option>
                    <option value="CANCELLED">Cancelado</option>
                    <option value="NO_SHOW">No asistió</option>
                  </select>
                </div>

                <div>
                  <label className="label">Servicio</label>
                  <select
                    value={filters.serviceId}
                    onChange={(e) => setFilters({ ...filters, serviceId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Todos los servicios</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {appointments.length} resultado{appointments.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile: Botón filtros (solo en vista lista) */}
        {isMobile && viewMode === 'list' && (
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center space-x-2 ${hasActiveFilters ? 'bg-purple-50 border-purple-300' : ''}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {[filters.date, filters.status, filters.serviceId].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Contenido Principal - Vista Lista o Calendario */}
        {appointments.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay citas
              </h3>
              <p className="text-gray-600 mb-6">
                {hasActiveFilters 
                  ? 'No se encontraron citas con los filtros aplicados'
                  : 'Aún no tienes citas programadas'
                }
              </p>
              <button onClick={() => handleCreateAppointment()} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                {hasActiveFilters ? 'Crear Cita' : 'Crear Primera Cita'}
              </button>
            </div>
          </div>
        ) : viewMode === 'calendar' ? (
          /* Vista Calendario */
          <CalendarView
            appointments={appointments}
            onEditAppointment={handleEditAppointment}
            onCreateAppointment={handleCreateAppointment}
            onStatusChange={handleStatusChange}
          />
        ) : viewMode === 'day' ? (
          /* Vista Día */
          <DayView
            appointments={appointments}
            onEditAppointment={handleEditAppointment}
            onCreateAppointment={handleCreateAppointment}
            onStatusChange={handleStatusChange}
          />
        ) : (
          /* Vista Lista */
          <>
            {/* Vista móvil - Cards */}
            {isMobile ? (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="card-mobile cursor-pointer" 
                    onClick={() => handleEditAppointment(appointment)}
                  >
                    <div className="p-4">
                      {/* Header de la card */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-purple-600">
                              {appointment.client?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {appointment.client?.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {appointment.service?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`badge ${getStatusColor(appointment.status)} text-xs`}>
                            {appointment.status === 'CONFIRMED' ? 'Conf.' : 
                             appointment.status === 'COMPLETED' ? 'Comp.' :
                             appointment.status === 'CANCELLED' ? 'Canc.' : 'No'}
                          </span>
                          <Edit3 className="w-4 h-4 text-gray-400" />
                          <button 
                            className="p-1 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Aquí podrías abrir un menú contextual si lo necesitas
                            }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Información de la cita */}
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{formatDate(appointment.startTime)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>{formatTime(appointment.startTime)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <DollarSign className="w-4 h-4 mr-2" />
                          <span>{formatCurrency(appointment.service?.price || 0)}</span>
                        </div>
                      </div>

                      {/* Información de contacto */}
                      {(appointment.client?.email || appointment.client?.phone) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {appointment.client?.email && (
                              <div className="flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                <span className="truncate">{appointment.client.email}</span>
                              </div>
                            )}
                            {appointment.client?.phone && (
                              <div className="flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                <span>{appointment.client.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Scoring del cliente */}
                      {appointment.clientScore?.hasScore && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <ClientStarRating
                            starRating={appointment.clientScore.starRating}
                            totalBookings={appointment.clientScore.totalBookings}
                            attendedCount={appointment.clientScore.attendedCount}
                            noShowCount={appointment.clientScore.noShowCount}
                            size="sm"
                            showLabel={false}
                          />
                        </div>
                      )}

                      {/* Acciones rápidas */}
                      {appointment.status === 'CONFIRMED' && (
                        <div className="mt-4 flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(appointment.id, 'COMPLETED');
                            }}
                            className="flex-1 bg-green-50 text-green-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                          >
                            Completar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(appointment.id, 'NO_SHOW');
                            }}
                            className="flex-1 bg-yellow-50 text-yellow-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-yellow-100 transition-colors"
                          >
                            No asistió
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Vista desktop - Tabla */
              <div className="card">
                <div className="card-body p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cliente & Servicio
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha & Hora
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Precio
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {appointments.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                      <span className="text-sm font-medium text-purple-600">
                                        {appointment.client?.name?.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {appointment.client?.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {appointment.service?.name}
                                    </div>
                                    {appointment.clientScore?.hasScore && (
                                      <div className="mt-1">
                                        <ClientStarRating
                                          starRating={appointment.clientScore.starRating}
                                          totalBookings={appointment.clientScore.totalBookings}
                                          attendedCount={appointment.clientScore.attendedCount}
                                          noShowCount={appointment.clientScore.noShowCount}
                                          size="sm"
                                          showLabel={false}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDate(appointment.startTime)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatTime(appointment.startTime)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`badge ${getStatusColor(appointment.status)}`}>
                                {getStatusText(appointment.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(appointment.service?.price || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                {appointment.status === 'CONFIRMED' && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(appointment.id, 'COMPLETED');
                                      }}
                                      className="text-green-600 hover:text-green-900"
                                    >
                                      Completar
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(appointment.id, 'NO_SHOW');
                                      }}
                                      className="text-yellow-600 hover:text-yellow-900"
                                    >
                                      No asistió
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAppointment(appointment);
                                  }}
                                  className="text-purple-600 hover:text-purple-900"
                                >
                                  Editar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB para móvil */}
      {isMobile && (
        <FloatingActionButton
          icon={Plus}
          onClick={() => handleCreateAppointment()}
          ariaLabel="Nueva cita"
        />
      )}

      {/* Modal de cita */}
      {isModalOpen && (
        <AppointmentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setInitialDateTime(null); // Limpiar la fecha/hora inicial al cerrar el modal
          }}
          onSubmit={handleSubmitAppointment}
          appointment={editingAppointment}
          services={services}
          professionals={professionals}
          isLoading={isSubmitting}
          initialDate={initialDateTime?.date}
          initialTime={initialDateTime?.time}
        />
      )}

      {/* Plan Limit Modal */}
      {showPlanLimitModal && planLimitData && (
        <PlanLimitModal
          isOpen={showPlanLimitModal}
          onClose={() => {
            setShowPlanLimitModal(false);
            setPlanLimitData(null);
          }}
          details={{
            ...planLimitData,
            feature: 'appointments'
          }}
        />
      )}

      {/* Low Scoring Warning Modal */}
      {showLowScoringWarning && lowScoringData && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleCancelLowScoring}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              {/* Header */}
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Cliente con Ranking Bajo</h2>
                  <p className="text-sm text-gray-500">Se requiere confirmación</p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-gray-700 mb-4">{lowScoringData.message}</p>
                
                {lowScoringData.clientScoring && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Historial del cliente:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Puntuación:</span>
                        <span className="font-medium text-gray-900">
                          {lowScoringData.clientScoring.starRating 
                            ? `${lowScoringData.clientScoring.starRating} ⭐` 
                            : 'Sin puntuación'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total de citas:</span>
                        <span className="font-medium text-gray-900">
                          {lowScoringData.clientScoring.totalBookings}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Asistió:</span>
                        <span className="font-medium text-green-600">
                          {lowScoringData.clientScoring.attendedCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">No asistió:</span>
                        <span className="font-medium text-red-600">
                          {lowScoringData.clientScoring.noShowCount}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-gray-600 mt-4 text-sm">
                  ¿Querés crear el turno de todas formas con pago en el local?
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelLowScoring}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  No, cancelar
                </button>
                <button
                  onClick={handleConfirmLowScoring}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creando...' : 'Sí, crear turno'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Appointments; 