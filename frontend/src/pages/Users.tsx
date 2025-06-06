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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error creando usuario';
      toast.error(message);
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isAdmin 
          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      }`}>
        <Shield className="w-3 h-3 mr-1" />
        {isAdmin ? 'Admin' : 'Empleado'}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <UsersIcon className="w-7 h-7 mr-3 text-blue-600" />
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administra empleados y sus permisos
          </p>
        </div>
        
        <div className="flex space-x-3">
          {/* Toggle View Mode */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <UsersIcon className="w-4 h-4 mr-1.5 inline" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'stats'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-1.5 inline" />
              Estadísticas
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Usuario
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="min-w-40">
                <select
                  value={filters.role || ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    role: e.target.value === '' ? null : e.target.value as 'ADMIN' | 'EMPLOYEE'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos los roles</option>
                  <option value="ADMIN">Administradores</option>
                  <option value="EMPLOYEE">Empleados</option>
                </select>
              </div>

              {/* Include Inactive */}
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.includeInactive || false}
                    onChange={(e) => setFilters(prev => ({ ...prev, includeInactive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Incluir inactivos
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Cargando usuarios...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center">
                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay usuarios
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {filters.search || filters.role 
                    ? 'No se encontraron usuarios con los filtros aplicados.'
                    : 'Comienza agregando tu primer empleado.'}
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Usuario
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Citas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Creado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                                <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.phone ? (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {user.phone}
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin teléfono</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {user._count?.appointments || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleViewUser(user)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`${
                                user.isActive 
                                  ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300'
                                  : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                              }`}
                              title={user.isActive ? 'Desactivar' : 'Activar'}
                            >
                              {user.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
    </div>
  );
};

export default Users; 