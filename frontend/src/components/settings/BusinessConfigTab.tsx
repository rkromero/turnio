import React, { useState, useEffect } from 'react';
import { Save, Building2, Phone, MapPin, FileText, Palette, Image, Clock, Scissors, Heart, Stethoscope, Sparkles } from 'lucide-react';
import { configService } from '../../services/api';
import type { BusinessConfig, BusinessConfigForm } from '../../types';
import { BusinessType } from '../../types';

interface BusinessConfigTabProps {
  businessConfig: BusinessConfig | null;
  onUpdate: (config: BusinessConfig) => void;
}

const BusinessConfigTab: React.FC<BusinessConfigTabProps> = ({ businessConfig, onUpdate }) => {
  const [formData, setFormData] = useState<BusinessConfigForm>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (businessConfig) {
      setFormData({
        name: businessConfig.name || '',
        phone: businessConfig.phone || '',
        address: businessConfig.address || '',
        description: businessConfig.description || '',
        primaryColor: businessConfig.primaryColor || '#3B82F6',
        logo: businessConfig.logo || '',
        businessType: businessConfig.businessType || BusinessType.GENERAL,
        defaultAppointmentDuration: businessConfig.defaultAppointmentDuration || 60
      });
    }
  }, [businessConfig]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'defaultAppointmentDuration' ? parseInt(value) : value
    }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Configuraciones predeterminadas por tipo de negocio
  const getBusinessTypeConfig = (type: BusinessType) => {
    const configs = {
      [BusinessType.GENERAL]: { duration: 60, icon: Building2, name: 'Negocio General' },
      [BusinessType.BARBERSHOP]: { duration: 30, icon: Scissors, name: 'Barbería' },
      [BusinessType.HAIR_SALON]: { duration: 60, icon: Sparkles, name: 'Peluquería' },
      [BusinessType.BEAUTY_CENTER]: { duration: 90, icon: Heart, name: 'Centro Estético' },
      [BusinessType.MEDICAL_CENTER]: { duration: 60, icon: Stethoscope, name: 'Centro Médico' },
      [BusinessType.MASSAGE_SPA]: { duration: 90, icon: Heart, name: 'Centro de Masajes/SPA' }
    };
    return configs[type];
  };

  const handleBusinessTypeChange = (type: BusinessType) => {
    const config = getBusinessTypeConfig(type);
    setFormData(prev => ({
      ...prev,
      businessType: type,
      defaultAppointmentDuration: config.duration
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'El nombre del negocio es requerido';
    } else if (formData.name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (formData.phone && !/^[+]?[\d\s\-()]{10,20}$/.test(formData.phone)) {
      newErrors.phone = 'Formato de teléfono inválido';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'La descripción no puede exceder 1000 caracteres';
    }

    if (formData.primaryColor && !/^#[0-9A-F]{6}$/i.test(formData.primaryColor)) {
      newErrors.primaryColor = 'El color debe ser un código hexadecimal válido';
    }

    if (formData.logo && !isValidUrl(formData.logo)) {
      newErrors.logo = 'La URL del logo no es válida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');

    try {
      const updatedConfig = await configService.updateBusinessConfig(formData);
      onUpdate(updatedConfig);
      setSuccessMessage('Configuración actualizada exitosamente');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: unknown) {
      console.error('Error actualizando configuración:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'message' in error.response.data
        ? String(error.response.data.message)
        : 'Error al actualizar la configuración';
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (!businessConfig) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Building2 className="h-6 w-6 text-primary-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Configuración del Negocio</h3>
          <p className="text-sm text-gray-600">Actualiza la información básica de tu negocio</p>
        </div>
      </div>

      {/* Mensajes de éxito/error */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {errors.general && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre del negocio */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="inline h-4 w-4 mr-1" />
              Nombre del Negocio *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ej: Salón de Belleza María"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline h-4 w-4 mr-1" />
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ej: +54 9 11 1234-5678"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Dirección */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline h-4 w-4 mr-1" />
            Dirección
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
          />
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe tu negocio..."
          />
          <p className="mt-1 text-sm text-gray-500">
            {formData.description?.length || 0}/1000 caracteres
          </p>
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Configuración del Negocio */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Configuración de Operación</h4>
          
          {/* Tipo de Negocio */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Building2 className="inline h-4 w-4 mr-1" />
              Tipo de Negocio
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.values(BusinessType).map((type) => {
                const config = getBusinessTypeConfig(type);
                const IconComponent = config.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleBusinessTypeChange(type)}
                    className={`p-3 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                      formData.businessType === type
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-5 w-5" />
                      <div>
                        <div className="font-medium text-sm">{config.name}</div>
                        <div className="text-xs text-gray-500">Sugerido: {config.duration} min</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duración de Turnos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="defaultAppointmentDuration" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Duración Predeterminada de Turnos
              </label>
              <select
                id="defaultAppointmentDuration"
                name="defaultAppointmentDuration"
                value={formData.defaultAppointmentDuration || 60}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos</option>
                <option value={90}>90 minutos</option>
                <option value={120}>120 minutos</option>
                <option value={180}>180 minutos</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Duración base para nuevos servicios. Puedes personalizar cada servicio individualmente.
              </p>
            </div>
          </div>
        </div>

        {/* Personalización visual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Color primario */}
          <div>
            <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
              <Palette className="inline h-4 w-4 mr-1" />
              Color Primario
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                id="primaryColor"
                name="primaryColor"
                value={formData.primaryColor || '#3B82F6'}
                onChange={handleInputChange}
                className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.primaryColor || '#3B82F6'}
                onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.primaryColor ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="#3B82F6"
              />
            </div>
            {errors.primaryColor && (
              <p className="mt-1 text-sm text-red-600">{errors.primaryColor}</p>
            )}
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
              <Image className="inline h-4 w-4 mr-1" />
              URL del Logo
            </label>
            <input
              type="url"
              id="logo"
              name="logo"
              value={formData.logo || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.logo ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="https://ejemplo.com/logo.png"
            />
            {errors.logo && (
              <p className="mt-1 text-sm text-red-600">{errors.logo}</p>
            )}
            {formData.logo && (
              <div className="mt-2">
                <img
                  src={formData.logo}
                  alt="Logo preview"
                  className="h-16 w-16 object-contain border border-gray-200 rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Información del plan (solo lectura) */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Información del Plan</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Plan actual:</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                businessConfig.planType === 'FREE' ? 'bg-gray-100 text-gray-800' :
                businessConfig.planType === 'BASIC' ? 'bg-blue-100 text-blue-800' :
                businessConfig.planType === 'PREMIUM' ? 'bg-purple-100 text-purple-800' :
                'bg-gold-100 text-gold-800'
              }`}>
                {businessConfig.planType}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Slug público:</span>
              <span className="ml-2 font-mono text-primary-600">{businessConfig.slug}</span>
            </div>
            <div>
              <span className="text-gray-600">Máximo citas/mes:</span>
              <span className="ml-2 font-medium">{businessConfig.maxAppointments}</span>
            </div>
          </div>
        </div>

        {/* Botón de guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={`flex items-center space-x-2 px-6 py-3 rounded-md text-white font-medium transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default BusinessConfigTab; 