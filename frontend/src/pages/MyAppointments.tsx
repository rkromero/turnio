import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { appointmentService } from '../services/api';
import type { Appointment } from '../types';
import { useToast } from '../hooks/useToast';
import SkeletonLoader from '../components/SkeletonLoader';

const MyAppointments: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    loadAppointments();
  }, [selectedDate, selectedStatus]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const params: {
        date: string;
        userId: string;
        status?: string;
      } = {
        date: selectedDate,
        userId: user?.id || '',
      };

      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const data = await appointmentService.getAppointments(params);
      setAppointments(data);
    } catch (err) {
      console.error('Error cargando mis turnos:', err);
      error('Error cargando los turnos');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await appointmentService.updateAppointment(appointmentId, { 
        status: newStatus as 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED' 
      });
      success('Estado actualizado correctamente');
      loadAppointments();
    } catch (err) {
      console.error('Error actualizando estado:', err);
      error('Error actualizando el estado');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'NO_SHOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'COMPLETED':
        return 'Completado';
      case 'NO_SHOW':
        return 'No se presentó';
      default:
        return status;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getQuickDateText = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date === today) return 'Hoy';
    if (date === tomorrow.toISOString().split('T')[0]) return 'Mañana';
    return formatDate(date);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi Agenda</h1>
            <p className="text-sm text-gray-600 mt-1">
              Turnos asignados a {user?.name}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-0">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todos</option>
                <option value="CONFIRMED">Confirmado</option>
                <option value="COMPLETED">Completado</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="NO_SHOW">No se presentó</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader />
        ) : (
          <>
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tienes turnos para esta fecha
                </h3>
                <p className="text-gray-600">
                  {selectedDate === new Date().toISOString().split('T')[0]
                    ? 'No hay turnos asignados para hoy'
                    : `No hay turnos asignados para ${getQuickDateText(selectedDate)}`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {appointment.client?.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {appointment.service?.name}
                        </p>
                        {appointment.notes && (
                          <p className="text-sm text-gray-500 mt-1">
                            <span className="font-medium">Notas:</span> {appointment.notes}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        {appointment.status === 'CONFIRMED' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleStatusUpdate(appointment.id, 'COMPLETED')}
                              className="btn-primary text-xs py-1 px-2"
                            >
                              Marcar Completado
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(appointment.id, 'NO_SHOW')}
                              className="btn-secondary text-xs py-1 px-2"
                            >
                              No se presentó
                            </button>
                          </div>
                        )}
                        
                        {appointment.status === 'COMPLETED' && (
                          <div className="text-xs text-green-600 font-medium">
                            ✅ Servicio completado
                          </div>
                        )}
                        
                        {appointment.status === 'NO_SHOW' && (
                          <div className="text-xs text-gray-500 font-medium">
                            ⏰ Cliente no se presentó
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyAppointments; 