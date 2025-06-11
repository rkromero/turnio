import React, { useState, useEffect, useRef } from 'react';
import { X, Building2, MapPin, Phone, Globe, Clock, Upload, Image as ImageIcon } from 'lucide-react';
import type { Branch, CreateBranchData } from '../../types/branch';
import { uploadService } from '../../services/uploadService';

interface BranchModalProps {
  branch?: Branch | null;
  onSave: (data: CreateBranchData) => Promise<void>;
  onClose: () => void;
}

const BranchModal: React.FC<BranchModalProps> = ({ branch, onSave, onClose }) => {
  const [formData, setFormData] = useState<CreateBranchData>({
    name: '',
    slug: '',
    address: '',
    phone: '',
    description: '',
    banner: '',
    bannerAlt: '',
    isMain: false,
    latitude: undefined,
    longitude: undefined,
    timezone: 'America/Argentina/Buenos_Aires'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name,
        slug: branch.slug,
        address: branch.address || '',
        phone: branch.phone || '',
        description: branch.description || '',
        banner: branch.banner || '',
        bannerAlt: branch.bannerAlt || '',
        isMain: branch.isMain,
        latitude: branch.latitude,
        longitude: branch.longitude,
        timezone: branch.timezone || 'America/Argentina/Buenos_Aires'
      });
      
      // Si hay una imagen existente, mostrarla como preview
      if (branch.banner) {
        setImagePreview(branch.banner);
      }
    }
  }, [branch]);

  // Función para manejar la selección de archivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar archivo usando el servicio
      const validation = uploadService.validateImageFile(file);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, banner: validation.error || 'Archivo inválido' }));
        return;
      }

      setImageFile(file);
      
      // Crear preview usando el servicio
      try {
        const preview = await uploadService.getImagePreview(file);
        setImagePreview(preview);
        
        // Limpiar errores
        if (errors.banner) {
          setErrors(prev => ({ ...prev, banner: '' }));
        }
      } catch (error) {
        console.error('Error generando preview:', error);
        setErrors(prev => ({ ...prev, banner: 'Error procesando la imagen' }));
      }
    }
  };

  // Función para subir imagen usando el servicio
  const uploadImage = async (file: File): Promise<string> => {
    setUploadingImage(true);
    
    try {
      // Simular delay de subida para mejor UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Usar el servicio de upload
      const imageUrl = await uploadService.uploadImage(file);
      return imageUrl;
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      throw error;
    }
  };

  // Función para abrir el selector de archivos
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Función para eliminar la imagen
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, banner: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'El identificador es requerido';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Solo se permiten letras minúsculas, números y guiones';
    }

    if (formData.phone && !/^[+]?[\d\s\-()]{10,20}$/.test(formData.phone)) {
      newErrors.phone = 'Formato de teléfono inválido';
    }

    if (formData.latitude && (formData.latitude < -90 || formData.latitude > 90)) {
      newErrors.latitude = 'Latitud debe estar entre -90 y 90';
    }

    if (formData.longitude && (formData.longitude < -180 || formData.longitude > 180)) {
      newErrors.longitude = 'Longitud debe estar entre -180 y 180';
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
      setLoading(true);
      
      const finalFormData = { ...formData };
      
      // Si hay una imagen nueva para subir
      if (imageFile) {
        try {
          const imageUrl = await uploadImage(imageFile);
          finalFormData.banner = imageUrl;
        } catch (error: unknown) {
          console.error('Error subiendo imagen:', error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido al subir la imagen';
          setErrors({ banner: `Error al subir la imagen: ${errorMessage}. Intenta de nuevo.` });
          return;
        } finally {
          setUploadingImage(false);
        }
      }
      
      await onSave(finalFormData);
    } catch (error: unknown) {
      console.error('Error guardando sucursal:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
                          typeof error.response === 'object' && error.response !== null && 
                          'data' in error.response && 
                          typeof error.response.data === 'object' && error.response.data !== null &&
                          'message' in error.response.data
                          ? String(error.response.data.message)
                          : 'Error al guardar la sucursal';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              name === 'latitude' || name === 'longitude' ? 
              (value === '' ? undefined : parseFloat(value)) : value
    }));

    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '-') // Reemplazar espacios por guiones
      .replace(/-+/g, '-') // Remover guiones dobles
      .trim();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      // Auto-generar slug solo si es nueva sucursal y el slug está vacío
      slug: !branch && !prev.slug ? generateSlugFromName(name) : prev.slug
    }));

    if (errors.name) {
      setErrors(prev => ({ ...prev, name: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {branch ? 'Editar Sucursal' : 'Nueva Sucursal'}
              </h2>
              <p className="text-sm text-gray-600">
                {branch ? 'Modifica los datos de la sucursal' : 'Agrega una nueva ubicación para tu negocio'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error general */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {errors.general}
            </div>
          )}

          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la sucursal *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleNameChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: Sucursal Centro"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                Identificador *
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.slug ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="ej: sucursal-centro"
              />
              {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Solo letras minúsculas, números y guiones. Se usa en URLs.
              </p>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="inline w-4 h-4 mr-1" />
              Dirección
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="inline w-4 h-4 mr-1" />
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ej: +54 9 11 1234-5678"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Descripción opcional de la sucursal..."
            />
          </div>

          {/* Banner de la sucursal */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Imagen de la sucursal</h3>
            
            {/* Input de archivo oculto */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            
            {/* Área de subida de imagen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="inline w-4 h-4 mr-1" />
                Imagen del banner
              </label>
              
              {/* Vista previa o área de subida */}
              {imagePreview ? (
                <div className="space-y-3">
                  <div className="relative border border-gray-300 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt={formData.bannerAlt || 'Vista previa del banner'}
                      className="w-full h-32 object-cover"
                    />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-sm">Subiendo imagen...</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cambiar imagen
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={handleUploadClick}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-purple-400 hover:bg-purple-50 ${
                    errors.banner ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    Haz clic para subir una imagen
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF hasta 5MB. Recomendado: 800x400px
                  </p>
                </div>
              )}
              
              {errors.banner && (
                <p className="text-red-500 text-sm mt-1">{errors.banner}</p>
              )}
            </div>

            {/* Texto alternativo */}
            <div>
              <label htmlFor="bannerAlt" className="block text-sm font-medium text-gray-700 mb-1">
                Texto alternativo
              </label>
              <input
                type="text"
                id="bannerAlt"
                name="bannerAlt"
                value={formData.bannerAlt}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Descripción de la imagen para accesibilidad"
              />
              <p className="text-xs text-gray-500 mt-1">
                Descripción de la imagen para personas con discapacidad visual
              </p>
            </div>
          </div>

          {/* Coordenadas GPS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="inline w-4 h-4 mr-1" />
                Latitud
              </label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                value={formData.latitude || ''}
                onChange={handleInputChange}
                step="any"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.latitude ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="-34.6037"
              />
              {errors.latitude && <p className="text-red-500 text-sm mt-1">{errors.latitude}</p>}
            </div>

            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                Longitud
              </label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                value={formData.longitude || ''}
                onChange={handleInputChange}
                step="any"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.longitude ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="-58.3816"
              />
              {errors.longitude && <p className="text-red-500 text-sm mt-1">{errors.longitude}</p>}
            </div>
          </div>

          {/* Zona horaria */}
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="inline w-4 h-4 mr-1" />
              Zona horaria
            </label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
              <option value="America/Argentina/Cordoba">Córdoba (UTC-3)</option>
              <option value="America/Argentina/Mendoza">Mendoza (UTC-3)</option>
              <option value="America/Santiago">Santiago (UTC-3)</option>
              <option value="America/Montevideo">Montevideo (UTC-3)</option>
            </select>
          </div>

          {/* Sucursal principal */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isMain"
              name="isMain"
              checked={formData.isMain}
              onChange={handleInputChange}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="isMain" className="ml-2 block text-sm text-gray-700">
              Marcar como sucursal principal
            </label>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : (branch ? 'Actualizar' : 'Crear Sucursal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchModal; 