import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  UserPlus, 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  BarChart3,
  Calendar,
  Phone,
  Clock
} from 'lucide-react';
import { UserWithStats, UserFilters, UserStats, CreateUserForm } from '../types';

import { userService } from '../services/userService';
import { UserModal } from '../components/users/UserModal';
import { UserStatsCard } from '../components/users/UserStatsCard';
import PlanLimitModal, { PlanLimitDetails } from '../components/PlanLimitModal';
import { toast } from 'react-hot-toast';

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    includeInactive: false,
    search: '',
    role: null
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [showPlanLimitModal, setShowPlanLimitModal] = useState(false);
  const [planLimitData, setPlanLimitData] = useState<PlanLimitDetails | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadUsers();
    loadStats();
  }, [filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers(filters);
      setUsers(data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      toast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await userService.getUserStats();
      setStats(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleCreateUser = async (userData: CreateUserForm) => {
    try {
      await userService.createUser(userData);
      toast.success('Usuario creado exitosamente');
      loadUsers();
      loadStats();
      setShowModal(false);
    } catch (error: unknown) {
      // Verificar si es un error de límite de plan
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string; details?: PlanLimitDetails } } };
        if (axiosError.response?.data?.error === 'PLAN_LIMIT_EXCEEDED') {
          const details = axiosError.response.data.details;
          if (details) {
            setPlanLimitData(details);
            setShowPlanLimitModal(true);
            setShowModal(false);
          }
        } else {
          const message = error instanceof Error ? error.message : 'Error creando usuario';
          toast.error(message);
        }
      } else {
        const message = error instanceof Error ? error.message : 'Error creando usuario';
        toast.error(message);
      }
      throw error;
    }
  };

  const handleUpdateUser = async (id: string, userData: Partial<CreateUserForm>) => {
    try {
      await userService.updateUser(id, userData);
      toast.success('Usuario actualizado exitosamente');
      loadUsers();
      loadStats();
      setShowModal(false);
      setSelectedUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error actualizando usuario';
      toast.error(message);
      throw error;
    }
  };

  const handleToggleStatus = async (user: UserWithStats) => {
    try {
      await userService.toggleUserStatus(user.id, !user.isActive);
      toast.success(`Usuario ${!user.isActive ? 'activado' : 'desactivado'} exitosamente`);
      loadUsers();
      loadStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error cambiando estado';
      toast.error(message);
    }
  };

  const handleDeleteUser = async (user: UserWithStats) => {
    if (!confirm(`¿Estás seguro de eliminar a ${user.name}?`)) return;
    
    try {
      await userService.deleteUser(user.id);
      toast.success('Usuario eliminado exitosamente');
      loadUsers();
      loadStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error eliminando usuario';
      toast.error(message);
    }
  };

  const handleViewUser = (user: UserWithStats) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleEditUser = (user: UserWithStats) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role: 'ADMIN' | 'EMPLOYEE') => {
    const isAdmin = role === 'ADMIN';
    return (
      <span className={`badge ${
        isAdmin 
          ? 'badge-primary'
          : 'bg-blue-100 text-blue-800'
      }`}>
        <Shield className="w-3 h-3 mr-1" />
        {isAdmin ? 'Admin' : 'Empleado'}
      </span>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <UsersIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-sm text-gray-600 mt-1">
              Administra empleados y sus permisos
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Toggle View Mode */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UsersIcon className="w-4 h-4 mr-1.5 inline" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'stats'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-1.5 inline" />
              Estadísticas
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary w-full sm:w-auto flex items-center justify-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Stats View */}
      {viewMode === 'stats' && stats && (
        <UserStatsCard stats={stats} />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Filters */}
          <div className="card">
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      value={filters.search || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <div>
                  <select
                    value={filters.role || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      role: e.target.value === '' ? null : e.target.value as 'ADMIN' | 'EMPLOYEE'
                    }))}
                    className="input-field"
                  >
                    <option value="">Todos los roles</option>
                    <option value="ADMIN">Administradores</option>
                    <option value="EMPLOYEE">Empleados</option>
                  </select>
                </div>
              </div>

              {/* Include Inactive */}
              <div className="mt-4 flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.includeInactive || false}
                    onChange={(e) => setFilters(prev => ({ ...prev, includeInactive: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Incluir usuarios inactivos
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="card">
            {loading ? (
              <div className="card-body text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto"></div>
                <p className="text-gray-600 mt-4">Cargando usuarios...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="card-body text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay usuarios
                </h3>
                <p className="text-gray-600 mb-6">
                  {filters.search || filters.role 
                    ? 'No se encontraron usuarios con los filtros aplicados.'
                    : 'Comienza agregando tu primer empleado.'}
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Usuario
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Citas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {user.avatar ? (
                                <img 
                                  src={user.avatar} 
                                  alt={user.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-purple-600">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.phone ? (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1 text-gray-400" />
                              {user.phone}
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin teléfono</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                            {user._count?.appointments || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${
                            user.isActive 
                              ? 'badge-success'
                              : 'badge-error'
                          }`}>
                            {user.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Activo
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactivo
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleViewUser(user)}
                              className="text-blue-600 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-green-600 hover:text-green-700 p-1 rounded-lg hover:bg-green-50 transition-colors duration-200"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`p-1 rounded-lg transition-colors duration-200 ${
                                user.isActive 
                                  ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              }`}
                              title={user.isActive ? 'Desactivar' : 'Activar'}
                            >
                              {user.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors duration-200"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* User Modal */}
      {showModal && (
        <UserModal
          user={selectedUser}
          onSave={selectedUser ? handleUpdateUser : handleCreateUser}
          onClose={() => {
            setShowModal(false);
            setSelectedUser(null);
          }}
        />
      )}

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
            feature: 'users'
          }}
        />
      )}
    </div>
  );
};

export default Users; 