import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, X, Clock, ChevronRight } from 'lucide-react';
import { appointmentService } from '../services/api';
import type { Appointment } from '../types';

interface PendingEvaluationWidgetProps {
  onRefresh?: () => void;
}

const PendingEvaluationWidget: React.FC<PendingEvaluationWidgetProps> = ({ onRefresh }) => {
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadPendingAppointments = async () => {
    try {
      setLoading(true);
      const result = await appointmentService.getPendingEvaluation();
      setPendingAppointments(result.data);
      setCount(result.count);
    } catch (error) {
      console.error('Error cargando turnos pendientes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingAppointments();
  }, []);

  const handleMarkAttendance = async (appointmentId: string, status: 'COMPLETED' | 'NO_SHOW') => {
    try {
      setUpdating(appointmentId);
      await appointmentService.updateAppointment(appointmentId, { status });
      
      // Remover del listado local
      setPendingAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      setCount(prev => prev - 1);
      
      // Notificar al padre para que refresque si es necesario
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error actualizando turno:', error);
      alert('Error al actualizar el turno');
    } finally {
      setUpdating(null);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Turnos Sin Evaluar</h3>
              <p className="text-sm text-gray-500">Cargando...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (count === 0) {
    return null; // No mostrar nada si no hay turnos pendientes
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Turnos Sin Evaluar
              </h3>
              <p className="text-sm text-gray-500">
                {count} turno{count !== 1 ? 's' : ''} esperando evaluación
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
              {count}
            </span>
            <ChevronRight 
              className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} 
            />
          </div>
        </div>
      </div>

      {/* Lista expandible */}
      {expanded && (
        <div className="border-t border-gray-200">
          <div className="max-h-[400px] overflow-y-auto">
            {pendingAppointments.map((appointment) => (
              <div 
                key={appointment.id}
                className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* Info del turno */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        {formatDate(appointment.startTime)}
                      </span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatTime(appointment.startTime)}
                      </span>
                    </div>
                    <div className="text-base font-medium text-gray-900">
                      {appointment.client?.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {appointment.service?.name}
                    </div>
                    {appointment.user && (
                      <div className="text-xs text-gray-500 mt-1">
                        Prof: {appointment.user.name}
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleMarkAttendance(appointment.id, 'COMPLETED')}
                      disabled={updating === appointment.id}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Marcar como asistió"
                    >
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">Asistió</span>
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(appointment.id, 'NO_SHOW')}
                      disabled={updating === appointment.id}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Marcar como no asistió"
                    >
                      <X className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">No asistió</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingEvaluationWidget;

