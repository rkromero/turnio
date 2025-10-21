import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, AlertTriangle, AlertCircle } from 'lucide-react';
import type { Appointment } from '../types';
import { useIsMobileSimple } from '../hooks/useIsMobile';

interface AppointmentWithScoring extends Appointment {
  clientScore?: {
    hasScore: boolean;
    starRating: number | null;
    totalBookings: number;
    attendedCount: number;
    noShowCount: number;
  };
  riskPrediction?: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    riskScore: number;
    clientRisk: number;
    timeSlotRisk: number;
    serviceRisk: number;
    anticipationRisk: number;
    reminderRisk: number;
  };
}

interface DayViewProps {
  appointments: AppointmentWithScoring[];
  onEditAppointment: (appointment: Appointment) => void;
  onCreateAppointment: (date?: string, time?: string) => void;
  onStatusChange: (appointmentId: string, newStatus: string) => void;
}

const DayView: React.FC<DayViewProps> = ({
  appointments,
  onEditAppointment,
  onCreateAppointment
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const isMobile = useIsMobileSimple();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  // Filtrar citas del día actual
  const todayAppointments = useMemo(() => {
    // Formatear fecha sin conversión de zona horaria
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    return appointments
      .filter(appointment => {
        // Parsear fecha sin conversión de zona horaria
        const appointmentDate = appointment.startTime.split('T')[0];
        return appointmentDate === today;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [appointments, currentDate]);

  // Generar horarios del día (6:00 AM - 10:00 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      slots.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        displayTime: hour < 12 ? `${hour === 0 ? 12 : hour}:00 AM` : `${hour === 12 ? 12 : hour - 12}:00 PM`
      });
    }
    return slots;
  }, []);

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = () => {
    const today = new Date();
    return currentDate.toDateString() === today.toDateString();
  };

  const formatTime = (dateString: string) => {
    // Parsear manualmente para mostrar hora exacta sin conversión de zona horaria
    const [datePart, timePart] = dateString.includes('T') ? dateString.split('T') : [dateString, '00:00:00'];
    const [hours, minutes] = timePart.split(':').map(Number);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      case 'NO_SHOW': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIndicator = (riskLevel?: string) => {
    if (!riskLevel) return null;
    
    switch (riskLevel) {
      case 'HIGH':
        return (
          <div className="flex items-center space-x-1 bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            <span className="hidden md:inline">Alto riesgo</span>
          </div>
        );
      case 'MEDIUM':
        return (
          <div className="flex items-center space-x-1 bg-yellow-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            <span className="hidden md:inline">Riesgo medio</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getAppointmentPosition = (appointment: AppointmentWithScoring) => {
    // Parsear manualmente sin conversión de zona horaria
    const startTime = new Date(appointment.startTime);
    const endTime = new Date(appointment.endTime);
    
    // Usar UTC para evitar conversión de zona horaria
    const startHour = startTime.getUTCHours();
    const startMinutes = startTime.getUTCMinutes();
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // en minutos
    
    const topPosition = ((startHour - 6) * 60 + startMinutes) * (60 / 60); // 60px por hora
    const height = Math.max(duration * (60 / 60), 40); // mínimo 40px de altura
    
    return {
      top: topPosition,
      height: height
    };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header del calendario */}
      <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {dayNames[currentDate.getDay()]}, {currentDate.getDate()} de {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            {!isToday() && (
              <button
                onClick={goToToday}
                className="btn-secondary text-sm py-2 px-3"
              >
                Hoy
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDay('prev')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => navigateDay('next')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Información del día */}
        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {todayAppointments.length} citas
          </span>
          {isToday() && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              Hoy
            </span>
          )}
        </div>
      </div>

      {/* Vista del día */}
      <div className="flex-1 overflow-y-auto max-h-[600px]">
        <div className="relative">
          {/* Líneas de tiempo */}
          <div className="absolute left-0 top-0 w-14 md:w-20">
            {timeSlots.map((slot) => (
              <div
                key={slot.hour}
                className="h-[60px] border-b border-gray-100 flex items-start pt-1"
              >
                <span className="text-xs text-gray-500 px-1 md:px-2">
                  {isMobile ? slot.time : slot.displayTime}
                </span>
              </div>
            ))}
          </div>

          {/* Área de citas */}
          <div className="ml-14 md:ml-20 relative">
            {/* Líneas de fondo */}
            {timeSlots.map((slot) => {
              // Formatear la fecha como YYYY-MM-DD SIN conversión a UTC
              const year = currentDate.getFullYear();
              const month = String(currentDate.getMonth() + 1).padStart(2, '0');
              const day = String(currentDate.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              // Hora en formato HH:mm
              const timeStr = slot.time;
              
              return (
                <div
                  key={slot.hour}
                  className="h-[60px] border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onCreateAppointment(dateStr, timeStr)}
                />
              );
            })}

            {/* Citas */}
            {todayAppointments.map((appointment) => {
              const position = getAppointmentPosition(appointment);
              return (
                <div
                  key={appointment.id}
                  className={`absolute left-1 right-1 md:left-2 md:right-2 rounded-lg border cursor-pointer hover:shadow-md transition-all overflow-hidden ${getStatusColor(appointment.status)}`}
                  style={{
                    top: `${position.top}px`,
                    height: `${position.height}px`,
                    minHeight: '40px'
                  }}
                  onClick={() => onEditAppointment(appointment)}
                >
                  <div className="p-1.5 md:p-2 h-full flex flex-col justify-start overflow-hidden">
                    <div className="flex-1 min-h-0 space-y-1">
                      {/* Risk indicator - prominente arriba */}
                      {appointment.riskPrediction?.riskLevel && (
                        <div className="mb-1">
                          {getRiskIndicator(appointment.riskPrediction.riskLevel)}
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm leading-tight break-words">
                          {appointment.client?.name}
                        </span>
                        <span className="text-xs font-medium whitespace-nowrap text-right">
                          {formatTime(appointment.startTime)}
                        </span>
                      </div>
                      
                      {/* Email - sin truncate para que se vea completo */}
                      {appointment.client?.email && (
                        <div className="text-xs text-gray-600 leading-tight break-words">
                          {appointment.client.email}
                        </div>
                      )}
                      
                      {appointment.service && (
                        <div className="text-xs text-gray-500 leading-tight break-words">
                          {appointment.service.name}
                        </div>
                      )}
                      
                      {appointment.client?.phone && (
                        <div className="flex items-center text-xs text-gray-500 leading-tight">
                          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="break-words">{appointment.client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mensaje cuando no hay citas */}
            {todayAppointments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay citas programadas
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {isToday() ? 'para hoy' : `para el ${currentDate.toLocaleDateString('es-AR')}`}
                  </p>
                  <button
                    onClick={() => onCreateAppointment()}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primera Cita
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-3">
          {/* Estados */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Estados</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                <span className="text-gray-600">Confirmado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                <span className="text-gray-600">Completado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                <span className="text-gray-600">No asistió</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span className="text-gray-600">Cancelado</span>
              </div>
            </div>
          </div>

          {/* Indicadores de riesgo */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Predicción de cancelación</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-gray-600">Alto riesgo de cancelación</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-3 h-3 text-yellow-500" />
                <span className="text-gray-600">Riesgo medio de cancelación</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView; 