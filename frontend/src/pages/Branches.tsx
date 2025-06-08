import React, { useState, useEffect } from 'react';
import { Plus, Building2, MapPin, Phone, Users, Calendar, Search, MoreVertical, Edit, Trash2, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BranchModal from '../components/branches/BranchModal';
import { branchService } from '../services/branchService';
import type { Branch, CreateBranchData } from '../types/branch';

const Branches: React.FC = () => {
  const { business } = useAuth();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await branchService.getBranches();
      setBranches(data);
    } catch (error) {
      console.error('Error cargando sucursales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = () => {
    setEditingBranch(null);
    setShowModal(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setShowModal(true);
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta sucursal?')) {
      try {
        await branchService.deleteBranch(branchId);
        await loadBranches();
      } catch (error) {
        console.error('Error eliminando sucursal:', error);
        alert('Error al eliminar la sucursal');
      }
    }
  };

  const handleSaveBranch = async (branchData: CreateBranchData) => {
    try {
      if (editingBranch) {
        await branchService.updateBranch(editingBranch.id, branchData);
      } else {
        await branchService.createBranch(branchData);
      }
      await loadBranches();
      setShowModal(false);
    } catch (error) {
      console.error('Error guardando sucursal:', error);
      throw error;
    }
  };

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Verificar si el plan permite múltiples sucursales
  const canCreateMultipleBranches = business?.planType === 'ENTERPRISE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sucursales</h1>
          <p className="text-gray-600">
            Gestiona las ubicaciones de tu negocio
          </p>
        </div>

        {canCreateMultipleBranches && (
          <button
            onClick={handleCreateBranch}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Sucursal
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar sucursales..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Plan limitation message */}
      {!canCreateMultipleBranches && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center">
            <Building2 className="w-5 h-5 text-amber-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">
                Múltiples sucursales disponibles en Plan Empresarial
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Actualiza tu plan para gestionar múltiples ubicaciones de tu negocio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Branches List */}
      {filteredBranches.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay sucursales</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron sucursales que coincidan con tu búsqueda.' : 'Comienza creando tu primera sucursal.'}
          </p>
          {canCreateMultipleBranches && !searchTerm && (
            <div className="mt-6">
              <button
                onClick={handleCreateBranch}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Sucursal
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onEdit={handleEditBranch}
              onDelete={handleDeleteBranch}
              onSelect={setSelectedBranch}
              isSelected={selectedBranch === branch.id}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <BranchModal
          branch={editingBranch}
          onSave={handleSaveBranch}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

// Branch Card Component
interface BranchCardProps {
  branch: Branch;
  onEdit: (branch: Branch) => void;
  onDelete: (branchId: string) => void;
  onSelect: (branchId: string) => void;
  isSelected: boolean;
}

const BranchCard: React.FC<BranchCardProps> = ({
  branch,
  onEdit,
  onDelete,
  onSelect,
  isSelected
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`bg-white rounded-lg border transition-all cursor-pointer ${
        isSelected 
          ? 'border-purple-500 shadow-lg ring-2 ring-purple-200' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={() => onSelect(branch.id)}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                {branch.name}
                {branch.isMain && (
                  <Star className="w-4 h-4 text-amber-500 fill-current" />
                )}
              </h3>
              <p className="text-sm text-gray-500">{branch.slug}</p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(branch);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <Edit className="w-3 h-3 mr-2" />
                  Editar
                </button>
                {!branch.isMain && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(branch.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          {branch.address && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{branch.address}</span>
            </div>
          )}

          {branch.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{branch.phone}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{branch._count?.users || 0} usuarios</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>{branch._count?.appointments || 0} citas</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              branch.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {branch.isActive ? 'Activa' : 'Inactiva'}
          </span>

          {branch.isMain && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Principal
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Branches; 