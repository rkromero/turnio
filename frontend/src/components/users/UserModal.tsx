import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, User, Mail, Phone, Shield, Image, Key } from 'lucide-react';
import { UserWithStats, CreateUserForm } from '../../types';
import { userService } from '../../services/userService';

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
    avatar: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailAvailable, setEmailAvailable] = useState(true);

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // No mostrar contraseña existente
        role: user.role,
        phone: user.phone || '',
        avatar: user.avatar || ''
      });
    } else {
      // Generar contraseña temporal para nuevos usuarios
      setFormData(prev => ({
        ...prev,
        password: userService.generateTempPassword()
      }));
    }
  }, [user]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Nombre completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Ej: Juan Pérez"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Key className="w-4 h-4 inline mr-1" />
              Contraseña {isEditing ? '(dejar vacío para mantener actual)' : '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className={`w-full px-3 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                  errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={isEditing ? 'Nueva contraseña...' : 'Contraseña temporal'}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={generateNewPassword}
                  className="text-blue-500 hover:text-blue-700 text-xs font-medium"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Shield className="w-4 h-4 inline mr-1" />
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'ADMIN' | 'EMPLOYEE' }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="EMPLOYEE">Empleado</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="+54 11 1234-5678"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Image className="w-4 h-4 inline mr-1" />
              URL del Avatar
            </label>
            <input
              type="url"
              value={formData.avatar}
              onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.avatar ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="https://ejemplo.com/avatar.jpg"
            />
            {errors.avatar && <p className="text-red-500 text-sm mt-1">{errors.avatar}</p>}
            {formData.avatar && (
              <div className="mt-2">
                <img 
                  src={formData.avatar} 
                  alt="Preview" 
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !emailAvailable}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
              {isEditing ? 'Actualizar' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 