import React, { useState, useEffect } from 'react';
import { Plus, Clock, Edit2, Trash2, Coffee, AlertCircle } from 'lucide-react';
import { BranchBreakTime, BranchBreakTimeForm } from '../../types';
import { Branch } from '../../types/branch';

interface BranchBreakTimesTabProps {
  branches: Branch[];
  onRefresh: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miercoles', short: 'Mie' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sabado', short: 'Sab' }
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://turnio-backend-production.up.railway.app';

// Función helper para hacer peticiones autenticadas
const fetchAuth = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include', // Incluir cookies httpOnly
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error del servidor' }));
    throw new Error(errorData.message || `Error: ${response.status}`);
  }

  return response;
};

const BranchBreakTimesTab: React.FC<BranchBreakTimesTabProps> = ({ branches, onRefresh }) => {
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [breakTimes, setBreakTimes] = useState<BranchBreakTime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBreakTime, setEditingBreakTime] = useState<BranchBreakTime | null>(null);
  const [formData, setFormData] = useState<BranchBreakTimeForm>({
    dayOfWeek: 1,
    startTime: '12:00',
    endTime: '13:00',
    name: 'Almuerzo',
    isActive: true
  });

  // Cargar horarios de descanso cuando se selecciona una sucursal
  useEffect(() => {
    if (selectedBranch) {
      loadBreakTimes(selectedBranch);
    }
  }, [selectedBranch]);

  const loadBreakTimes = async (branchId: string) => {
    setIsLoading(true);
    try {
      const response = await fetchAuth(`/api/break-times/branch/${branchId}`);
      const data = await response.json();
      setBreakTimes(data.data.breakTimes || []);
    } catch (error) {
      console.error('Error cargando horarios de descanso:', error);
      setBreakTimes([]);
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    setIsLoading(true);
    try {
      const url = editingBreakTime 
        ? `/api/break-times/${editingBreakTime.id}`
        : `/api/break-times/branch/${selectedBranch}`;
      
      const method = editingBreakTime ? 'PUT' : 'POST';

      await fetchAuth(url, {
        method,
        body: JSON.stringify(formData)
      });

      setShowModal(false);
      setEditingBreakTime(null);
      resetForm();
      loadBreakTimes(selectedBranch);
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar horario de descanso');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (breakTimeId: string) => {
    if (!confirm('Estas seguro de que quieres eliminar este horario de descanso?')) {
      return;
    }

    setIsLoading(true);
    try {
      await fetchAuth(`/api/break-times/${breakTimeId}`, {
        method: 'DELETE'
      });

      loadBreakTimes(selectedBranch);
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar horario de descanso');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      dayOfWeek: 1,
      startTime: '12:00',
      endTime: '13:00',
      name: 'Almuerzo',
      isActive: true
    });
  };

  const openEditModal = (breakTime: BranchBreakTime) => {
    setEditingBreakTime(breakTime);
    setFormData({
      dayOfWeek: breakTime.dayOfWeek,
      startTime: breakTime.startTime,
      endTime: breakTime.endTime,
      name: breakTime.name || '',
      isActive: breakTime.isActive
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingBreakTime(null);
    resetForm();
    setShowModal(true);
  };

  const groupBreakTimesByDay = () => {
    const grouped: { [key: number]: BranchBreakTime[] } = {};
    breakTimes.forEach(bt => {
      if (!grouped[bt.dayOfWeek]) {
        grouped[bt.dayOfWeek] = [];
      }
      grouped[bt.dayOfWeek].push(bt);
    });
    return grouped;
  };

  const selectedBranchData = branches.find(b => b.id === selectedBranch);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Coffee className="h-6 w-6 text-amber-600" />
            Horarios de Descanso
          </h2>
          <p className="text-gray-600 mt-1">
            Configura los horarios en que cada sucursal permanece cerrada (almuerzo, pausas, etc.)
          </p>
        </div>
        {selectedBranch && (
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar Horario
          </button>
        )}
      </div>

      {/* Selector de sucursal */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Sucursal
        </label>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecciona una sucursal...</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>
              {branch.name} {branch.isMain && '(Principal)'}
            </option>
          ))}
        </select>
      </div>

      {/* Informacion de la sucursal seleccionada */}
      {selectedBranchData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">
                Configurando: {selectedBranchData.name}
              </h3>
              <p className="text-blue-700 text-sm mt-1">
                Los horarios de descanso configurados aqui aplicaran solo a esta sucursal. 
                Durante estos periodos no se podran agendar turnos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de horarios de descanso */}
      {selectedBranch && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Horarios Configurados
            </h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando horarios...</p>
            </div>
          ) : breakTimes.length === 0 ? (
            <div className="p-8 text-center">
              <Coffee className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sin horarios de descanso
              </h3>
              <p className="text-gray-500 mb-4">
                Esta sucursal no tiene horarios de descanso configurados.
              </p>
              <button
                onClick={openCreateModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Agregar Primer Horario
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {DAYS_OF_WEEK.map(day => {
                const dayBreakTimes = groupBreakTimesByDay()[day.value] || [];
                
                return (
                  <div key={day.value} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">{day.label}</h4>
                      {dayBreakTimes.length === 0 && (
                        <span className="text-sm text-gray-500">Sin descansos</span>
                      )}
                    </div>

                    {dayBreakTimes.length > 0 && (
                      <div className="space-y-3">
                        {dayBreakTimes.map(breakTime => (
                          <div
                            key={breakTime.id}
                            className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
                          >
                            <div className="flex items-center gap-4">
                              <Clock className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {breakTime.startTime} - {breakTime.endTime}
                                </div>
                                {breakTime.name && (
                                  <div className="text-sm text-gray-500">
                                    {breakTime.name}
                                  </div>
                                )}
                              </div>
                              {!breakTime.isActive && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                  Inactivo
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(breakTime)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(breakTime.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal para crear/editar horario de descanso */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingBreakTime ? 'Editar Horario de Descanso' : 'Nuevo Horario de Descanso'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dia de la semana
                </label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora de inicio
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora de fin
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Almuerzo, Pausa de la tarde"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Activo
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBreakTime(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Guardando...' : editingBreakTime ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchBreakTimesTab; 