import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, X, CalendarDays, RotateCcw } from 'lucide-react';
import { configService } from '../../services/api';
import type { Holiday, HolidayForm } from '../../types';

interface HolidaysTabProps {
  holidays: Holiday[];
  onUpdate: (holidays: Holiday[]) => void;
}

interface HolidayModalProps {
  holiday?: Holiday;
  isOpen: boolean;
  onClose: () => void;
  onSave: (holiday: Holiday) => void;
}

const HolidayModal: React.FC<HolidayModalProps> = ({ holiday, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<HolidayForm>({
    name: '',
    date: '',
    isRecurring: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (holiday) {
      setFormData({
        name: holiday.name,
        date: holiday.date.split('T')[0], // Formatear fecha para input
        isRecurring: holiday.isRecurring
      });
    } else {
      setFormData({
        name: '',
        date: '',
        isRecurring: false
      });
    }
    setErrors({});
  }, [holiday, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.date) {
      newErrors.date = 'La fecha es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let savedHoliday: Holiday;
      
      if (holiday) {
        savedHoliday = await configService.updateHoliday(holiday.id, formData);
      } else {
        savedHoliday = await configService.createHoliday(formData);
      }
      
      onSave(savedHoliday);
      onClose();
    } catch (error: unknown) {
      console.error('Error guardando feriado:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'message' in error.response.data
        ? String(error.response.data.message)
        : 'Error al guardar el feriado';
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            {holiday ? 'Editar Feriado' : 'Nuevo Feriado'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errors.general && (
          <div className="m-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Feriado *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ej: Año Nuevo"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isRecurring"
              name="isRecurring"
              checked={formData.isRecurring}
              onChange={handleInputChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-700">
              <RotateCcw className="inline h-4 w-4 mr-1" />
              Feriado anual (se repite cada año)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const HolidaysTab: React.FC<HolidaysTabProps> = ({ holidays, onUpdate }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const filteredHolidays = holidays.filter(holiday => {
    const holidayYear = new Date(holiday.date).getFullYear();
    return holidayYear === selectedYear;
  });

  const handleNewHoliday = () => {
    setEditingHoliday(undefined);
    setIsModalOpen(true);
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setIsModalOpen(true);
  };

  const handleDeleteHoliday = async (holiday: Holiday) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${holiday.name}"?`)) {
      return;
    }

    setIsLoading(true);
    try {
      await configService.deleteHoliday(holiday.id);
      const updatedHolidays = holidays.filter(h => h.id !== holiday.id);
      onUpdate(updatedHolidays);
      setSuccessMessage('Feriado eliminado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error eliminando feriado:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveHoliday = (savedHoliday: Holiday) => {
    if (editingHoliday) {
      // Actualizar existente
      const updatedHolidays = holidays.map(h => 
        h.id === savedHoliday.id ? savedHoliday : h
      );
      onUpdate(updatedHolidays);
    } else {
      // Agregar nuevo
      onUpdate([...holidays, savedHoliday]);
    }
    setSuccessMessage(editingHoliday ? 'Feriado actualizado exitosamente' : 'Feriado creado exitosamente');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const groupHolidaysByMonth = (holidays: Holiday[]) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const grouped: Record<number, Holiday[]> = {};
    
    holidays.forEach(holiday => {
      const month = new Date(holiday.date).getMonth();
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(holiday);
    });

    // Ordenar por fecha dentro de cada mes
    Object.keys(grouped).forEach(month => {
      grouped[Number(month)].sort((a, b) => 
        new Date(a.date).getDate() - new Date(b.date).getDate()
      );
    });

    return { grouped, months };
  };

  const { grouped, months } = groupHolidaysByMonth(filteredHolidays);

  return (
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Calendar className="h-6 w-6 text-primary-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gestión de Feriados</h3>
          <p className="text-sm text-gray-600">
            Administra los días no laborables y feriados de tu negocio
          </p>
        </div>
      </div>

      {/* Controles superiores */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <label htmlFor="yearSelect" className="text-sm font-medium text-gray-700">
            Año:
          </label>
          <select
            id="yearSelect"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleNewHoliday}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Feriado</span>
        </button>
      </div>

      {/* Mensaje de éxito */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {/* Lista de feriados */}
      {filteredHolidays.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay feriados para {selectedYear}
          </h3>
          <p className="text-gray-600 mb-4">
            Agrega feriados para que se muestren como días no laborables.
          </p>
          <button
            onClick={handleNewHoliday}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors mx-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Primer Feriado</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {months.map((monthName, monthIndex) => {
            const monthHolidays = grouped[monthIndex];
            if (!monthHolidays || monthHolidays.length === 0) return null;

            return (
              <div key={monthIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {monthName} {selectedYear}
                  </h4>
                </div>
                <div className="divide-y divide-gray-200">
                  {monthHolidays.map(holiday => (
                    <div key={holiday.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="font-medium text-gray-900">
                            {holiday.name}
                          </div>
                          {holiday.isRecurring && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Anual
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(holiday.date)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditHoliday(holiday)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Editar feriado"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(holiday)}
                          disabled={isLoading}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Eliminar feriado"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Información adicional */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          💡 Información sobre Feriados
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Los feriados aparecerán como días no disponibles en el sistema de reservas</li>
          <li>• Los feriados marcados como "anuales" se repetirán automáticamente cada año</li>
          <li>• Puedes configurar feriados específicos para tu región o negocio</li>
        </ul>
      </div>

      {/* Modal */}
      <HolidayModal
        holiday={editingHoliday}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveHoliday}
      />
    </div>
  );
};

export default HolidaysTab; 