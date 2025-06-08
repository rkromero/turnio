import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, User, Mail, Phone, Shield, Image, Key, Building2 } from 'lucide-react';
import { UserWithStats, CreateUserForm } from '../../types';
import { Branch } from '../../types/branch';
import { userService } from '../../services/userService';
import { branchService } from '../../services/branchService';

interface UserModalProps {
  user?: UserWithStats | null;
  onSave: ((data: CreateUserForm) => Promise<void>) | ((id: string, data: Partial<CreateUserForm>) => Promise<void>);
  onClose: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState<CreateUserForm>({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    phone: '',
    avatar: '',
    branchId: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailAvailable, setEmailAvailable] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const isEditing = !!user;

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

    loadBranches();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // No mostrar contraseña existente
        role: user.role,
        phone: user.phone || '',
        avatar: user.avatar || '',
        branchId: user.branchId || ''
      });
    } else {
      // Generar contraseña temporal para nuevos usuarios
      setFormData(prev => ({
        ...prev,
        password: userService.generateTempPassword(),
        // Asignar sucursal principal por defecto
        branchId: branches.find(b => b.isMain)?.id || (branches[0]?.id || '')
      }));
    }
  }, [user, branches]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    } else if (!emailAvailable) {
      newErrors.email = 'Este email ya está en uso';
    }

    if (!isEditing && !formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    } else if (formData.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'La contraseña debe contener al menos: 1 minúscula, 1 mayúscula y 1 número';
    }

    if (formData.phone && !/^[\d\s\-+()]+$/.test(formData.phone)) {
      newErrors.phone = 'Formato de teléfono inválido';
    }

    if (formData.avatar && !/^https?:\/\/.+/.test(formData.avatar)) {
      newErrors.avatar = 'La URL del avatar debe ser válida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkEmailAvailability = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    
    try {
      const available = await userService.validateEmail(email, user?.id);
      setEmailAvailable(available);
    } catch (error) {
      console.error('Error validando email:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      if (isEditing && user) {
        // Actualizar usuario existente
        const updateData: Partial<CreateUserForm> = {};
        if (formData.name !== user.name) updateData.name = formData.name;
        if (formData.email !== user.email) updateData.email = formData.email;
        if (formData.role !== user.role) updateData.role = formData.role;
        if (formData.phone !== (user.phone || '')) updateData.phone = formData.phone;
        if (formData.avatar !== (user.avatar || '')) updateData.avatar = formData.avatar;
        if (formData.password) updateData.password = formData.password;
        if (formData.branchId !== (user.branchId || '')) updateData.branchId = formData.branchId;

        await (onSave as (id: string, data: Partial<CreateUserForm>) => Promise<void>)(user.id, updateData);
      } else {
        // Crear nuevo usuario
        await (onSave as (data: CreateUserForm) => Promise<void>)(formData);
      }
    } catch (error) {
      console.error('Error guardando usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewPassword = () => {
    const newPassword = userService.generateTempPassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="label">
              <User className="w-4 h-4 inline mr-1" />
              Nombre completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`input-field ${
                errors.name ? 'input-error' : ''
              }`}
              placeholder="Ej: Juan Pérez"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="label">
              <Mail className="w-4 h-4 inline mr-1" />
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, email: e.target.value }));
                checkEmailAvailability(e.target.value);
              }}
              className={`input-field ${
                errors.email ? 'input-error' : ''
              }`}
              placeholder="juan@ejemplo.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            {!emailAvailable && !errors.email && (
              <p className="text-orange-500 text-sm mt-1">Este email ya está en uso</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="label">
              <Key className="w-4 h-4 inline mr-1" />
              Contraseña {isEditing ? '(dejar vacío para mantener actual)' : '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className={`input-field pr-20 ${
                  errors.password ? 'input-error' : ''
                }`}
                placeholder={isEditing ? 'Nueva contraseña...' : 'Contraseña temporal'}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors duration-200"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={generateNewPassword}
                  className="text-purple-600 hover:text-purple-700 text-xs font-medium px-2 py-1 rounded hover:bg-purple-50 transition-colors duration-200"
                  title="Generar nueva contraseña"
                >
                  Gen
                </button>
              </div>
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            {formData.password && (
              <p className="text-xs text-gray-500 mt-1">
                Debe contener: 1 minúscula, 1 mayúscula, 1 número (mín. 6 caracteres)
              </p>
            )}
          </div>

          {/* Rol */}
          <div>
            <label className="label">
              <Shield className="w-4 h-4 inline mr-1" />
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'ADMIN' | 'EMPLOYEE' }))}
              className="input-field"
            >
              <option value="EMPLOYEE">Empleado</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          {/* Teléfono */}
          <div>
            <label className="label">
              <Phone className="w-4 h-4 inline mr-1" />
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className={`input-field ${
                errors.phone ? 'input-error' : ''
              }`}
              placeholder="+54 11 1234-5678"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          {/* Avatar */}
          <div>
            <label className="label">
              <Image className="w-4 h-4 inline mr-1" />
              URL del Avatar
            </label>
            <input
              type="url"
              value={formData.avatar}
              onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
              className={`input-field ${
                errors.avatar ? 'input-error' : ''
              }`}
              placeholder="https://ejemplo.com/avatar.jpg"
            />
            {errors.avatar && <p className="text-red-500 text-sm mt-1">{errors.avatar}</p>}
            {formData.avatar && (
              <div className="mt-2">
                <img 
                  src={formData.avatar} 
                  alt="Preview" 
                  className="w-12 h-12 rounded-full object-cover shadow-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Sucursal */}
          <div>
            <label className="label">
              <Building2 className="w-4 h-4 inline mr-1" />
              Sucursal
            </label>
            <select
              value={formData.branchId}
              onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
              className="input-field"
              disabled={loadingBranches}
            >
              {loadingBranches ? (
                <option value="">Cargando sucursales...</option>
              ) : branches.length === 0 ? (
                <option value="">No hay sucursales disponibles</option>
              ) : (
                branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} {branch.isMain ? '(Principal)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !emailAvailable}
              className="btn-primary disabled:opacity-50"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>}
              {isEditing ? 'Actualizar' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 