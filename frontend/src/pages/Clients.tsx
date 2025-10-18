import React, { useState, useEffect } from 'react';
import { clientService, appointmentService } from '../services/api';
import type { Client, Appointment } from '../types';
import ClientModal from '../components/ClientModal';
import ClientStarRating from '../components/ClientStarRating';
import FloatingActionButton from '../components/FloatingActionButton';
import { useIsMobileSimple } from '../hooks/useIsMobile';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [clientScoring, setClientScoring] = useState<{
    starRating: number | null;
    totalBookings: number;
    attendedCount: number;
    noShowCount: number;
  } | null>(null);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobileSimple();
  const { user } = useAuth();
  
  // Verificar si el usuario puede eliminar clientes (solo admins)
  const canDeleteClients = user?.role === 'ADMIN';
  
  // Verificar si el usuario puede crear clientes directamente (solo admins)
  const canCreateClients = user?.role === 'ADMIN';

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

  const loadClientScoring = async (client: Client) => {
    try {
      // Construir la URL de la API para obtener el scoring
      const params = new URLSearchParams();
      if (client.email) params.append('email', client.email);
      if (client.phone) params.append('phone', client.phone);
      
      if (params.toString()) {
        const response = await fetch(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?${params.toString()}`);
        const scoreData = await response.json();
        
        if (scoreData.success && scoreData.data) {
          setClientScoring({
            starRating: scoreData.data.starRating,
            totalBookings: scoreData.data.totalBookings || 0,
            attendedCount: scoreData.data.attendedCount || 0,
            noShowCount: scoreData.data.noShowCount || 0
          });
        } else {
          // Cliente sin historial
          setClientScoring({
            starRating: null,
            totalBookings: 0,
            attendedCount: 0,
            noShowCount: 0
          });
        }
      } else {
        // Cliente sin email ni teléfono
        setClientScoring({
          starRating: null,
          totalBookings: 0,
          attendedCount: 0,
          noShowCount: 0
        });
      }
    } catch (error) {
      console.error('Error cargando scoring del cliente:', error);
      setClientScoring({
        starRating: null,
        totalBookings: 0,
        attendedCount: 0,
        noShowCount: 0
      });
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
    await Promise.all([
      loadClientAppointments(client.id),
      loadClientScoring(client)
    ]);
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

  const handleBackToList = () => {
    setShowClientDetails(false);
    setSelectedClient(null);
    setClientAppointments([]);
    setClientScoring(null);
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="loading-spinner-mobile mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  // Vista móvil - Pantalla completa para detalles
  if (isMobile && showClientDetails && selectedClient) {
    return (
      <>
        <div className="space-y-6">
          {/* Header con botón de regreso */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToList}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">
                {selectedClient.name}
              </h1>
              <p className="text-sm text-gray-600">Detalles del cliente</p>
            </div>
            <button
              onClick={() => handleEditClient(selectedClient)}
              className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>

          {/* Información del cliente */}
          <div className="card">
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedClient.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Cliente desde {formatDate(selectedClient.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Scoring del Cliente - Mobile */}
                {clientScoring && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <ClientStarRating
                      starRating={clientScoring.starRating}
                      totalBookings={clientScoring.totalBookings}
                      attendedCount={clientScoring.attendedCount}
                      noShowCount={clientScoring.noShowCount}
                    />
                  </div>
                )}

                {selectedClient.email && (
                  <div className="flex items-center space-x-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{selectedClient.email}</span>
                  </div>
                )}

                {selectedClient.phone && (
                  <div className="flex items-center space-x-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{selectedClient.phone}</span>
                  </div>
                )}

                {selectedClient.notes && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">{selectedClient.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Historial de citas */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Historial de Citas ({clientAppointments.length})
              </h3>
            </div>
            <div className="card-body p-0">
              {clientAppointments.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {clientAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {appointment.service?.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(appointment.startTime)}
                          </p>
                        </div>
                        <span className={`badge ${getStatusColor(appointment.status)} text-xs`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay citas registradas</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de cliente */}
        {isModalOpen && (
          <ClientModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmitClient}
            client={editingClient}
            isLoading={isSubmitting}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className={`${isMobile ? 'space-y-6' : `flex h-full ${showClientDetails ? 'space-x-6' : ''}`}`}>
        {/* Lista de Clientes */}
        <div className={`${!isMobile && showClientDetails ? 'w-1/2' : 'w-full'} ${!isMobile ? 'transition-all duration-300' : ''}`}>
          {/* Header - Optimizado para móvil */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {isMobile ? 'Clientes' : 'Gestión de Clientes'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isMobile ? 'Tu base de clientes' : 'Administra tu base de clientes y su historial'}
              </p>
            </div>
            {!isMobile && canCreateClients && (
              <button onClick={handleCreateClient} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Cliente
              </button>
            )}
          </div>

          {/* Stats Cards - Grid responsive */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div className="stats-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs md:text-sm font-medium text-gray-600">Total</p>
                  <p className="text-lg md:text-2xl font-semibold text-gray-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="stats-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs md:text-sm font-medium text-gray-600">
                    {isMobile ? 'Email' : 'Con Email'}
                  </p>
                  <p className="text-lg md:text-2xl font-semibold text-gray-900">
                    {stats.withEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="stats-card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs md:text-sm font-medium text-gray-600">
                    {isMobile ? 'Teléfono' : 'Con Teléfono'}
                  </p>
                  <p className="text-lg md:text-2xl font-semibold text-gray-900">
                    {stats.withPhone}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Buscador */}
          <div className="card mb-6">
            <div className="card-body">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar clientes por nombre, email o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          {/* Lista de Clientes */}
          {filteredClients.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No se encontraron clientes' : 'No hay clientes'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? 'Intenta con otros términos de búsqueda'
                    : canCreateClients
                      ? 'Comienza agregando tu primer cliente'
                      : 'Los clientes aparecerán aquí cuando asignes turnos'
                  }
                </p>
                {!searchTerm && canCreateClients && (
                  <button onClick={handleCreateClient} className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primer Cliente
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Vista móvil - Cards */}
              {isMobile ? (
                <div className="space-y-3">
                  {filteredClients.map((client) => (
                    <div 
                      key={client.id} 
                      className="card-mobile cursor-pointer"
                      onClick={() => handleClientClick(client)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-purple-600">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {client.name}
                              </h3>
                              <div className="space-y-1">
                                {client.email && (
                                  <p className="text-xs text-gray-600 truncate flex items-center">
                                    <Mail className="w-3 h-3 mr-1" />
                                    {client.email}
                                  </p>
                                )}
                                {client.phone && (
                                  <p className="text-xs text-gray-600 flex items-center">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {client.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClient(client);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Vista desktop - Tabla */
                <div className="card">
                  <div className="card-body p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cliente
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Contacto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Registro
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredClients.map((client) => (
                            <tr 
                              key={client.id} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleClientClick(client)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                      <span className="text-sm font-medium text-purple-600">
                                        {client.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {client.name}
                                    </div>
                                    {client.notes && (
                                      <div className="text-sm text-gray-500 truncate max-w-xs">
                                        {client.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {client.email && (
                                    <div className="flex items-center mb-1">
                                      <Mail className="w-4 h-4 text-gray-400 mr-2" />
                                      {client.email}
                                    </div>
                                  )}
                                  {client.phone && (
                                    <div className="flex items-center">
                                      <Phone className="w-4 h-4 text-gray-400 mr-2" />
                                      {client.phone}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(client.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditClient(client);
                                    }}
                                    className="text-purple-600 hover:text-purple-900"
                                  >
                                    Editar
                                  </button>
                                  {canDeleteClients && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClient(client.id);
                                      }}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel de Detalles - Solo desktop */}
        {!isMobile && showClientDetails && selectedClient && (
          <div className="w-1/2 border-l border-gray-200 pl-6">
            <div className="sticky top-0 space-y-6">
              {/* Header del panel */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalles del Cliente
                </h2>
                <button
                  onClick={handleBackToList}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Información del cliente */}
              <div className="card">
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedClient.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Cliente desde {formatDate(selectedClient.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Scoring del cliente */}
                    {clientScoring && (
                      <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                        <ClientStarRating
                          starRating={clientScoring.starRating}
                          totalBookings={clientScoring.totalBookings}
                          attendedCount={clientScoring.attendedCount}
                          noShowCount={clientScoring.noShowCount}
                          size="md"
                          showDetails={true}
                          showLabel={true}
                        />
                      </div>
                    )}

                    {selectedClient.email && (
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-600">{selectedClient.email}</span>
                      </div>
                    )}

                    {selectedClient.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-600">{selectedClient.phone}</span>
                      </div>
                    )}

                    {selectedClient.notes && (
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-gray-600">{selectedClient.notes}</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEditClient(selectedClient)}
                          className="btn-secondary flex items-center space-x-2"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Editar</span>
                        </button>
                        {canDeleteClients && (
                          <button
                            onClick={() => handleDeleteClient(selectedClient.id)}
                            className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial de citas */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Historial de Citas ({clientAppointments.length})
                  </h3>
                </div>
                <div className="card-body p-0 max-h-96 overflow-y-auto">
                  {clientAppointments.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {clientAppointments.map((appointment) => (
                        <div key={appointment.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {appointment.service?.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatDateTime(appointment.startTime)}
                              </p>
                            </div>
                            <span className={`badge ${getStatusColor(appointment.status)}`}>
                              {getStatusText(appointment.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No hay citas registradas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB para móvil */}
      {isMobile && !showClientDetails && canCreateClients && (
        <FloatingActionButton
          icon={Plus}
          onClick={handleCreateClient}
          ariaLabel="Nuevo cliente"
        />
      )}

      {/* Modal de cliente */}
      {isModalOpen && (
        <ClientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitClient}
          client={editingClient}
          isLoading={isSubmitting}
        />
      )}
    </>
  );
};

export default Clients; 