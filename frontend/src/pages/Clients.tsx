import React, { useState, useEffect } from 'react';
import { clientService, appointmentService } from '../services/api';
import type { Client, Appointment } from '../types';
import ClientModal from '../components/ClientModal';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientAppointments = async (clientId: string) => {
    try {
      const appointments = await appointmentService.getAppointments({ clientId });
      setClientAppointments(appointments);
    } catch (error) {
      console.error('Error cargando citas del cliente:', error);
      setClientAppointments([]);
    }
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleSubmitClient = async (data: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  }) => {
    try {
      setIsSubmitting(true);
      
      if (editingClient) {
        await clientService.updateClient(editingClient.id, data);
        
        // Si estamos viendo detalles del cliente editado, actualizarlo
        if (selectedClient && selectedClient.id === editingClient.id) {
          const updatedClient = await clientService.getClient(editingClient.id);
          setSelectedClient(updatedClient);
        }
      } else {
        await clientService.createClient(data);
      }
      
      await loadClients();
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error guardando cliente:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClientClick = async (client: Client) => {
    setSelectedClient(client);
    setShowClientDetails(true);
    await loadClientAppointments(client.id);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('¿Estás seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await clientService.deleteClient(clientId);
      await loadClients();
      
      // Si estamos viendo detalles del cliente eliminado, cerrar el panel
      if (selectedClient && selectedClient.id === clientId) {
        setShowClientDetails(false);
        setSelectedClient(null);
      }
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      alert('Error al eliminar el cliente');
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  const getClientStats = () => {
    const totalClients = clients.length;
    const clientsWithEmail = clients.filter(c => c.email).length;
    const clientsWithPhone = clients.filter(c => c.phone).length;
    
    return {
      total: totalClients,
      withEmail: clientsWithEmail,
      withPhone: clientsWithPhone
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const stats = getClientStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Lista de Clientes */}
      <div className={`${showClientDetails ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
            <p className="mt-1 text-sm text-gray-600">
              Administra tu base de clientes y su historial
            </p>
          </div>
          <button onClick={handleCreateClient} className="btn-primary">
            <span className="mr-2">+</span>
            Nuevo Cliente
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    👥
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    📧
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Con Email</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.withEmail}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    📱
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Con Teléfono</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.withPhone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Buscar clientes por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? `No hay clientes que coincidan con "${searchTerm}"`
                  : 'Aún no tienes clientes registrados'
                }
              </p>
              {!searchTerm && (
                <button onClick={handleCreateClient} className="btn-primary">
                  <span className="mr-2">+</span>
                  Agregar Primer Cliente
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body p-0">
              <div className="overflow-y-auto max-h-96">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                      selectedClient?.id === client.id ? 'bg-primary-50 border-primary-200' : ''
                    }`}
                    onClick={() => handleClientClick(client)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{client.name}</h3>
                        <div className="mt-1 space-y-1">
                          {client.email && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <span className="mr-1">📧</span>
                              {client.email}
                            </p>
                          )}
                          {client.phone && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <span className="mr-1">📞</span>
                              {client.phone}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Cliente desde {formatDate(client.createdAt)}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClient(client);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar cliente"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar cliente"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel de Detalles del Cliente */}
      {showClientDetails && selectedClient && (
        <div className="w-1/2 ml-6 card">
          <div className="card-body">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedClient.name}
                </h2>
                <p className="text-sm text-gray-600">
                  Cliente desde {formatDate(selectedClient.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setShowClientDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Información de Contacto */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Información de Contacto</h3>
              <div className="space-y-2">
                {selectedClient.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📧</span>
                    <a href={`mailto:${selectedClient.email}`} className="hover:text-primary-600">
                      {selectedClient.email}
                    </a>
                  </div>
                )}
                {selectedClient.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📞</span>
                    <a href={`tel:${selectedClient.phone}`} className="hover:text-primary-600">
                      {selectedClient.phone}
                    </a>
                  </div>
                )}
                {selectedClient.notes && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-900 mb-1">Notas:</p>
                    <p className="text-sm text-gray-600">{selectedClient.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Historial de Citas */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Historial de Citas ({clientAppointments.length})
              </h3>
              
              {clientAppointments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Este cliente no tiene citas registradas
                </p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {clientAppointments.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {appointment.service?.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatDateTime(appointment.startTime)}
                          </p>
                          {appointment.notes && (
                            <p className="text-xs text-gray-500 mt-1">
                              {appointment.notes}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <button className="btn-primary flex-1">
                  <span className="mr-2">📅</span>
                  Nueva Cita
                </button>
                <button 
                  onClick={() => handleEditClient(selectedClient)}
                  className="btn-secondary"
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        onSubmit={handleSubmitClient}
        client={editingClient}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Clients; 