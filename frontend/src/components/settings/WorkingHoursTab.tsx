import React, { useState, useEffect } from 'react';
import { Save, Clock, User, ToggleLeft, ToggleRight, Plus, Trash2 } from 'lucide-react';
import { configService } from '../../services/api';
import type { UserWithWorkingHours, WorkingHoursForm } from '../../types';

interface WorkingHoursTabProps {
  users: UserWithWorkingHours[];
  onUpdate: (users: UserWithWorkingHours[]) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
];

const WorkingHoursTab: React.FC<WorkingHoursTabProps> = ({ users, onUpdate }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [workingHours, setWorkingHours] = useState<WorkingHoursForm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const selectedUser = users.find(user => user.id === selectedUserId);

  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  useEffect(() => {
    if (selectedUser) {
      // Inicializar horarios con los existentes o crear vacíos
      const initialHours = DAYS_OF_WEEK.map(day => {
        const existing = selectedUser.workingHours.find(wh => wh.dayOfWeek === day.value);
        return existing ? {
          dayOfWeek: existing.dayOfWeek,
          startTime: existing.startTime,
          endTime: existing.endTime,
          isActive: existing.isActive
        } : {
          dayOfWeek: day.value,
          startTime: '09:00',
          endTime: '17:00',
          isActive: false
        };
      });
      setWorkingHours(initialHours);
    }
  }, [selectedUser]);

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setErrors({});
    setSuccessMessage('');
  };

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setWorkingHours(prev => prev.map(wh => 
      wh.dayOfWeek === dayOfWeek 
        ? { ...wh, [field]: value }
        : wh
    ));
    
    // Limpiar error del día
    setErrors(prev => ({ ...prev, [`day_${dayOfWeek}`]: '' }));
  };

  const handleActiveToggle = (dayOfWeek: number) => {
    setWorkingHours(prev => prev.map(wh => 
      wh.dayOfWeek === dayOfWeek 
        ? { ...wh, isActive: !wh.isActive }
        : wh
    ));
  };

  const validateWorkingHours = (): boolean => {
    const newErrors: Record<string, string> = {};

    workingHours.forEach(wh => {
      if (wh.isActive) {
        // Validar formato de hora
        if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(wh.startTime)) {
          newErrors[`day_${wh.dayOfWeek}`] = 'Formato de hora de inicio inválido';
          return;
        }
        
        if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(wh.endTime)) {
          newErrors[`day_${wh.dayOfWeek}`] = 'Formato de hora de fin inválido';
          return;
        }

        // Validar que hora de inicio sea menor que hora de fin
        const startMinutes = timeToMinutes(wh.startTime);
        const endMinutes = timeToMinutes(wh.endTime);
        
        if (startMinutes >= endMinutes) {
          newErrors[`day_${wh.dayOfWeek}`] = 'La hora de inicio debe ser menor que la hora de fin';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      setErrors({ general: 'Selecciona un usuario' });
      return;
    }

    if (!validateWorkingHours()) {
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');

    try {
      const activeHours = workingHours.filter(wh => wh.isActive);
      const updatedUser = await configService.updateWorkingHours(selectedUserId, activeHours);
      
      // Actualizar la lista de usuarios
      const updatedUsers = users.map(user => 
        user.id === selectedUserId ? updatedUser : user
      );
      onUpdate(updatedUsers);
      
      setSuccessMessage('Horarios de trabajo actualizados exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: unknown) {
      console.error('Error actualizando horarios:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'message' in error.response.data
        ? String(error.response.data.message)
        : 'Error al actualizar los horarios';
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToAll = () => {
    const firstActiveDay = workingHours.find(wh => wh.isActive);
    if (firstActiveDay) {
      setWorkingHours(prev => prev.map(wh => ({
        ...wh,
        startTime: firstActiveDay.startTime,
        endTime: firstActiveDay.endTime,
        isActive: true
      })));
    }
  };

  const handleDisableAll = () => {
    setWorkingHours(prev => prev.map(wh => ({ ...wh, isActive: false })));
  };

  if (users.length === 0) {
    return (
      <div className="p-6 text-center">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
        <p className="text-gray-600">
          Necesitas tener al menos un usuario para configurar horarios de trabajo.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Clock className="h-6 w-6 text-primary-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Horarios de Trabajo</h3>
          <p className="text-sm text-gray-600">
            Configura los horarios de trabajo para cada miembro del equipo
          </p>
        </div>
      </div>

      {/* Selector de usuario */}
      <div className="mb-6">
        <label htmlFor="userSelect" className="block text-sm font-medium text-gray-700 mb-2">
          <User className="inline h-4 w-4 mr-1" />
          Seleccionar Usuario
        </label>
        <select
          id="userSelect"
          value={selectedUserId}
          onChange={(e) => handleUserChange(e.target.value)}
          className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.email})
            </option>
          ))}
        </select>
      </div>

      {/* Mensajes de éxito/error */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {errors.general && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Botones de acción rápida */}
        <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">
          <button
            type="button"
            onClick={handleCopyToAll}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Aplicar a todos los días</span>
          </button>
          <button
            type="button"
            onClick={handleDisableAll}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
          >
            <Trash2 className="h-4 w-4" />
            <span>Desactivar todos</span>
          </button>
        </div>

        {/* Horarios por día */}
        <div className="space-y-4">
          {DAYS_OF_WEEK.map(day => {
            const dayHours = workingHours.find(wh => wh.dayOfWeek === day.value);
            if (!dayHours) return null;

            return (
              <div
                key={day.value}
                className={`border rounded-lg p-4 transition-all ${
                  dayHours.isActive 
                    ? 'border-primary-200 bg-primary-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">{day.label}</h4>
                    <button
                      type="button"
                      onClick={() => handleActiveToggle(day.value)}
                      className="flex items-center"
                    >
                      {dayHours.isActive ? (
                        <ToggleRight className="h-6 w-6 text-primary-600" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">
                    {dayHours.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {dayHours.isActive && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora de inicio
                      </label>
                      <input
                        type="time"
                        value={dayHours.startTime}
                        onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora de fin
                      </label>
                      <input
                        type="time"
                        value={dayHours.endTime}
                        onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {errors[`day_${day.value}`] && (
                  <p className="mt-2 text-sm text-red-600">{errors[`day_${day.value}`]}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Resumen */}
        {selectedUser && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Resumen de Horarios - {selectedUser.name}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {workingHours.filter(wh => wh.isActive).map(wh => {
                const day = DAYS_OF_WEEK.find(d => d.value === wh.dayOfWeek);
                return (
                  <div key={wh.dayOfWeek} className="flex justify-between items-center">
                    <span className="font-medium">{day?.label}:</span>
                    <span className="text-gray-600">
                      {wh.startTime} - {wh.endTime}
                    </span>
                  </div>
                );
              })}
              {workingHours.filter(wh => wh.isActive).length === 0 && (
                <span className="text-gray-500 italic">Sin horarios configurados</span>
              )}
            </div>
          </div>
        )}

        {/* Botón de guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={`flex items-center space-x-2 px-6 py-3 rounded-md text-white font-medium transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'Guardando...' : 'Guardar Horarios'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkingHoursTab; 