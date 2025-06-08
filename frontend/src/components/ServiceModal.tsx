import React, { useState, useEffect } from 'react';
import { Building2, Globe, MapPin } from 'lucide-react';
import type { Service, ServiceForm } from '../types';
import { Branch } from '../types/branch';
import { branchService } from '../services/branchService';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceForm) => Promise<void>;
  service?: Service | null;
  isLoading?: boolean;
}

const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  service,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<ServiceForm>({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    color: '#3B82F6',
    isGlobal: true,
    branchIds: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Cargar sucursales disponibles
  useEffect(() => {
    const loadBranches = async () => {
      try {
        setLoadingBranches(true);
        const availableBranches = await branchService.getBranches();
        setBranches(availableBranches);
      } catch (error) {
        console.error('Error cargando sucursales:', error);
      } finally {
        setLoadingBranches(false);
      }
    };

    if (isOpen) {
      loadBranches();
    }
  }, [isOpen]);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        duration: service.duration,
        price: service.price,
        color: service.color || '#3B82F6',
        isGlobal: true, // Por defecto, los servicios editados son globales
        branchIds: []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        duration: 60,
        price: 0,
        color: '#3B82F6',
        isGlobal: true,
        branchIds: []
      });
    }
    setErrors({});
  }, [service, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.duration <= 0) {
      newErrors.duration = 'La duración debe ser mayor a 0';
    }

    if (formData.price < 0) {
      newErrors.price = 'El precio no puede ser negativo';
    }

    // Validar sucursales para servicios específicos
    if (!formData.isGlobal && (!formData.branchIds || formData.branchIds.length === 0)) {
      newErrors.branchIds = 'Debes seleccionar al menos una sucursal para servicios específicos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error al guardar servicio:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
    
    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBranchToggle = (branchId: string) => {
    setFormData(prev => ({
      ...prev,
      branchIds: prev.branchIds?.includes(branchId)
        ? prev.branchIds.filter(id => id !== branchId)
        : [...(prev.branchIds || []), branchId]
    }));

    // Limpiar error al seleccionar sucursales
    if (errors.branchIds) {
      setErrors(prev => ({ ...prev, branchIds: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {service ? 'Editar Servicio' : 'Nuevo Servicio'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Servicio *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : ''
              }`}
              placeholder="Ej: Corte de pelo"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Descripción opcional del servicio..."
            />
          </div>

          {/* Duración y Precio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duración (min) *
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.duration ? 'border-red-500' : ''
                }`}
              />
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
              )}
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Precio (ARS) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.price ? 'border-red-500' : ''
                }`}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
            </div>
          </div>

          {/* Color */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
              Color del Servicio
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                id="color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={handleInputChange}
                name="color"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          {/* Disponibilidad por Sucursal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disponibilidad por Sucursal
            </label>
            <div className="space-y-3">
              {/* Opción Global */}
              <div className="flex items-center">
                <input
                  type="radio"
                  id="global"
                  checked={formData.isGlobal}
                  onChange={() => setFormData(prev => ({ ...prev, isGlobal: true, branchIds: [] }))}
                  className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor="global" className="ml-2 flex items-center text-sm text-gray-700">
                  <Globe className="w-4 h-4 mr-1" />
                  Disponible en todas las sucursales
                </label>
              </div>

              {/* Opción Específica */}
              <div className="flex items-center">
                <input
                  type="radio"
                  id="specific"
                  checked={!formData.isGlobal}
                  onChange={() => setFormData(prev => ({ ...prev, isGlobal: false }))}
                  className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor="specific" className="ml-2 flex items-center text-sm text-gray-700">
                  <MapPin className="w-4 h-4 mr-1" />
                  Disponible en sucursales específicas
                </label>
              </div>

              {/* Selección de Sucursales Específicas */}
              {!formData.isGlobal && (
                <div className="ml-6 mt-3 space-y-2">
                  {loadingBranches ? (
                    <p className="text-sm text-gray-500">Cargando sucursales...</p>
                  ) : branches.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay sucursales disponibles</p>
                  ) : (
                    branches.map(branch => (
                      <div key={branch.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`branch-${branch.id}`}
                          checked={formData.branchIds?.includes(branch.id) || false}
                          onChange={() => handleBranchToggle(branch.id)}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label htmlFor={`branch-${branch.id}`} className="ml-2 flex items-center text-sm text-gray-700">
                          <Building2 className="w-4 h-4 mr-1" />
                          {branch.name} {branch.isMain ? '(Principal)' : ''}
                        </label>
                      </div>
                    ))
                  )}
                  {errors.branchIds && (
                    <p className="mt-1 text-sm text-red-600">{errors.branchIds}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </div>
            ) : (
              service ? 'Actualizar' : 'Crear Servicio'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;