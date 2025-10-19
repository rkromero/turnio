import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, User } from 'lucide-react';
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
}

interface CalendarViewProps {
  appointments: AppointmentWithScoring[];
  onEditAppointment: (appointment: Appointment) => void;
  onCreateAppointment: (date?: string, time?: string) => void;
  onStatusChange: (appointmentId: string, newStatus: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
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

  const dayNames = isMobile 
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Generar días del calendario
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Agrupar citas por día
  const appointmentsByDay = useMemo(() => {
    const grouped: { [key: string]: AppointmentWithScoring[] } = {};
    
    appointments.forEach(appointment => {
      const date = new Date(appointment.startTime);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(appointment);
    });
    
    // Ordenar citas por hora
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });
    
    return grouped;
  }, [appointments]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDayKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires'
    });
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header del calendario */}
      <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToToday}
              className="btn-secondary text-sm py-2 px-3"
            >
              Hoy
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid del calendario */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Cabecera de días */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {dayNames.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del calendario */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const dayKey = getDayKey(day);
              const dayAppointments = appointmentsByDay[dayKey] || [];
              const isCurrentMonthDay = isCurrentMonth(day);
              const isTodayDay = isToday(day);

              return (
                <div
                  key={index}
                  className={`min-h-[120px] md:min-h-[140px] p-2 border-r border-b border-gray-200 last:border-r-0 ${
                    !isCurrentMonthDay ? 'bg-gray-50' : ''
                  } ${isTodayDay ? 'bg-blue-50' : ''}`}
                >
                  {/* Número del día */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${
                        !isCurrentMonthDay
                          ? 'text-gray-400'
                          : isTodayDay
                          ? 'text-blue-600 font-bold'
                          : 'text-gray-900'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    
                    {/* Indicador de cantidad de citas */}
                    {dayAppointments.length > 0 && (
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  {/* Lista de citas del día */}
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {dayAppointments.slice(0, isMobile ? 2 : 3).map((appointment) => (
                      <div
                        key={appointment.id}
                        onClick={() => onEditAppointment(appointment)}
                        className={`text-xs p-2 rounded border cursor-pointer hover:shadow-sm transition-all ${getStatusColor(appointment.status)}`}
                      >
                        <div className="flex items-center space-x-1 mb-1">
                          <Clock className="w-3 h-3" />
                          <span className="font-medium">
                            {formatTime(appointment.startTime)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 truncate">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {appointment.client?.name}
                          </span>
                        </div>
                        {appointment.service && (
                          <div className="text-xs text-gray-600 truncate mt-1">
                            {appointment.service.name}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Indicador de más citas */}
                    {dayAppointments.length > (isMobile ? 2 : 3) && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{dayAppointments.length - (isMobile ? 2 : 3)} más
                      </div>
                    )}
                  </div>

                  {/* Botón para agregar cita (solo en días del mes actual) */}
                  {isCurrentMonthDay && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Formatear la fecha como YYYY-MM-DD
                        const dateStr = day.toISOString().split('T')[0];
                        onCreateAppointment(dateStr);
                      }}
                      className="w-full mt-2 p-1 text-xs text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {isMobile ? '+' : 'Agregar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
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
    </div>
  );
};

export default CalendarView; 