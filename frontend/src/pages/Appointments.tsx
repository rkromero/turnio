import React, { useState, useEffect } from 'react';
import { appointmentService, serviceService } from '../services/api';
import type { Appointment, Service, AppointmentForm } from '../types';
import AppointmentModal from '../components/AppointmentModal';
import ClientStarRating from '../components/ClientStarRating';

interface AppointmentWithScoring extends Appointment {
  clientScore?: {
    hasScore: boolean;
    starRating: number | null;
    totalBookings: number;
    attendedCount: number;
    noShowCount: number;
  };
}

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentWithScoring[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    date: '',
    status: '',
    serviceId: ''
  });

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
      const [appointmentsData, servicesData] = await Promise.all([
        appointmentService.getAppointments(filters),
        serviceService.getServices()
      ]);
      
      // Cargar scoring para cada cita
      const appointmentsWithScoring = await loadClientScoring(appointmentsData);
      
      setAppointments(appointmentsWithScoring);
      setServices(servicesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = () => {
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleSubmitAppointment = async (data: AppointmentForm) => {
    try {
      setIsSubmitting(true);
      
      if (editingAppointment) {
        await appointmentService.updateAppointment(editingAppointment.id, data);
      } else {
        await appointmentService.createAppointment(data);
      }
      
      await loadData();
      setIsModalOpen(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Error guardando cita:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
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

            await fetch('https://turnio-backend-production.up.railway.app/api/client-scoring/event', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('¿Estás seguro que deseas cancelar esta cita?')) {
      return;
    }

    try {
      await appointmentService.cancelAppointment(appointmentId);
      await loadData();
    } catch (error) {
      console.error('Error cancelando cita:', error);
      alert('Error al cancelar la cita');
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
    switch (status) {
      case 'CONFIRMED': return 'Confirmado';
      case 'COMPLETED': return 'Completado';
      case 'CANCELLED': return 'Cancelado';
      case 'NO_SHOW': return 'No asistió';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
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
      new Date(apt.startTime) > now && 
      apt.status === 'CONFIRMED'
    );
  };

  const getTodayAppointments = () => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfDay && aptDate <= endOfDay;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando citas...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citas y Turnos</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona todas las citas de tu negocio
          </p>
        </div>
        <button onClick={handleCreateAppointment} className="btn-primary">
          <span className="mr-2">+</span>
          Nueva Cita
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  📅
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hoy</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {getTodayAppointments().length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  ⏰
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Próximas</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {getUpcomingAppointments().length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  📊
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {appointments.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todos los estados</option>
                <option value="CONFIRMED">Confirmado</option>
                <option value="COMPLETED">Completado</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="NO_SHOW">No asistió</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servicio
              </label>
              <select
                value={filters.serviceId}
                onChange={(e) => setFilters({ ...filters, serviceId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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

          {(filters.date || filters.status || filters.serviceId) && (
            <div className="mt-4">
              <button
                onClick={() => setFilters({ date: '', status: '', serviceId: '' })}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay citas
            </h3>
            <p className="text-gray-600 mb-6">
              {filters.date || filters.status || filters.serviceId 
                ? 'No se encontraron citas con los filtros aplicados'
                : 'Aún no tienes citas programadas'
              }
            </p>
            <button onClick={handleCreateAppointment} className="btn-primary">
              <span className="mr-2">+</span>
              Crear Primera Cita
            </button>
          </div>
        </div>
      ) : (
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
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.client?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.service?.name}
                          </div>
                          {appointment.client?.phone && (
                            <div className="text-xs text-gray-400">
                              📞 {appointment.client.phone}
                            </div>
                          )}
                          {appointment.clientScore?.hasScore && (
                            <div className="mt-1">
                              <ClientStarRating
                                starRating={appointment.clientScore.starRating}
                                totalBookings={appointment.clientScore.totalBookings}
                                attendedCount={appointment.clientScore.attendedCount}
                                noShowCount={appointment.clientScore.noShowCount}
                                size="sm"
                                showLabel={true}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(appointment.startTime)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
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
                                onClick={() => handleStatusChange(appointment.id, 'COMPLETED')}
                                className="text-green-600 hover:text-green-900"
                                title="Marcar como completado"
                              >
                                ✅
                              </button>
                              <button
                                onClick={() => handleStatusChange(appointment.id, 'NO_SHOW')}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Marcar como no asistió"
                              >
                                ⚠️
                              </button>
                            </>
                          )}
                          
                          {appointment.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Cancelar cita"
                            >
                              ❌
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleEditAppointment(appointment)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar cita"
                          >
                            ✏️
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

      {/* Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAppointment(null);
        }}
        onSubmit={handleSubmitAppointment}
        appointment={editingAppointment}
        services={services}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Appointments; 