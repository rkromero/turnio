import React, { useState, useEffect } from 'react';
import { serviceService } from '../services/api';
import type { Service, ServiceForm } from '../types';
import ServiceModal from '../components/ServiceModal';
import PlanLimitModal, { PlanLimitDetails } from '../components/PlanLimitModal';
import { toast } from 'react-hot-toast';

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showPlanLimitModal, setShowPlanLimitModal] = useState(false);
  const [planLimitData, setPlanLimitData] = useState<PlanLimitDetails | null>(null);

  useEffect(() => {
    loadServices();
  }, [showInactive]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await serviceService.getServices(showInactive);
      setServices(data);
    } catch (error) {
      console.error('Error cargando servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleSubmitService = async (data: ServiceForm) => {
    try {
      setIsSubmitting(true);
      
      if (editingService) {
        await serviceService.updateService(editingService.id, data);
        toast.success('Servicio actualizado exitosamente');
      } else {
        await serviceService.createService(data);
        toast.success('Servicio creado exitosamente');
      }
      
      await loadServices();
      setIsModalOpen(false);
      setEditingService(null);
    } catch (error: unknown) {
      console.error('Error guardando servicio:', error);
      
      // Verificar si es un error de límite de plan
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string; details?: PlanLimitDetails } } };
        if (axiosError.response?.data?.error === 'PLAN_LIMIT_EXCEEDED') {
          const details = axiosError.response.data.details;
          if (details) {
            setPlanLimitData(details);
            setShowPlanLimitModal(true);
            setIsModalOpen(false);
          }
        } else {
          const message = error instanceof Error ? error.message : 'Error guardando servicio';
          toast.error(message);
        }
      } else {
        const message = error instanceof Error ? error.message : 'Error guardando servicio';
        toast.error(message);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!confirm(`¿Estás seguro que deseas eliminar el servicio "${service.name}"?`)) {
      return;
    }

    try {
      await serviceService.deleteService(service.id);
      await loadServices();
    } catch (error) {
      console.error('Error eliminando servicio:', error);
      alert('Error al eliminar el servicio');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona los servicios que ofreces a tus clientes
          </p>
        </div>
        <button
          onClick={handleCreateService}
          className="btn-primary"
        >
          <span className="mr-2">+</span>
          Nuevo Servicio
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Mostrar servicios inactivos
            </span>
          </label>
        </div>
      </div>

      {/* Lista de Servicios */}
      {services.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">⚙️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay servicios
          </h3>
          <p className="text-gray-600 mb-6">
            Comienza creando tu primer servicio para que los clientes puedan reservar
          </p>
          <button
            onClick={handleCreateService}
            className="btn-primary"
          >
            <span className="mr-2">+</span>
            Crear Primer Servicio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className={`card ${!service.isActive ? 'opacity-60' : ''}`}
            >
              <div className="card-body">
                {/* Header del servicio */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: service.color || '#3B82F6' }}
                    ></div>
                    <div>
                      <h3 className="font-medium text-gray-900">{service.name}</h3>
                      {!service.isActive && (
                        <span className="text-xs text-gray-500 font-medium">
                          INACTIVO
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEditService(service)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteService(service)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Descripción */}
                {service.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {service.description}
                  </p>
                )}

                {/* Información del servicio */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Duración:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDuration(service.duration)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Precio:</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                </div>

                {/* Footer con fecha */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Creado el {new Date(service.createdAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingService(null);
        }}
        onSubmit={handleSubmitService}
        service={editingService}
        isLoading={isSubmitting}
      />

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
            feature: 'services'
          }}
        />
      )}
    </div>
  );
};

export default Services; 