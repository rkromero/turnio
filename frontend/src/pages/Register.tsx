import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RegisterForm } from '../types';
import { BusinessType } from '../types';
import Logo from '../components/Logo';
import { Building2, Clock, Scissors, Heart, Stethoscope, Sparkles } from 'lucide-react';

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterForm>({
    businessName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    description: '',
    businessType: BusinessType.GENERAL,
    defaultAppointmentDuration: 60,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'defaultAppointmentDuration' ? parseInt(value) : value
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err 
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error al registrar el negocio'
        : 'Error al registrar el negocio';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Logo size="xl" className="justify-center mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700">
            Registra tu Negocio
          </h2>
          <p className="mt-2 text-gray-600">
            Comienza a gestionar tus turnos en minutos
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="businessName" className="label">
                    Nombre del Negocio *
                  </label>
                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    required
                    className="input-field"
                    placeholder="Ej: Peluquería Luna"
                    value={formData.businessName}
                    onChange={handleChange}
                  />
                </div>

                {/* Tipo de Negocio */}
                <div className="md:col-span-2">
                  <label className="label mb-3">
                    <Building2 className="inline h-4 w-4 mr-1" />
                    Tipo de Negocio *
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
                              <div className="text-xs text-gray-500">{config.duration} min</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Duración de Turnos */}
                <div>
                  <label htmlFor="defaultAppointmentDuration" className="label">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Duración de Turnos *
                  </label>
                  <select
                    id="defaultAppointmentDuration"
                    name="defaultAppointmentDuration"
                    value={formData.defaultAppointmentDuration}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value={30}>30 minutos</option>
                    <option value={60}>60 minutos</option>
                    <option value={90}>90 minutos</option>
                    <option value={120}>120 minutos</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Puedes cambiar esto después en configuración
                  </p>
                </div>

                <div>
                  <label htmlFor="email" className="label">
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="input-field"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="label">
                    Contraseña *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="input-field"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="label">
                    Teléfono
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="input-field"
                    placeholder="+54 9 11 1234-5678"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="address" className="label">
                    Dirección
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    className="input-field"
                    placeholder="Av. Corrientes 1234, CABA"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="label">
                    Descripción del Negocio
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="input-field"
                    placeholder="Describe brevemente tu negocio..."
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  🎉 Plan Gratuito incluye:
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Hasta 30 turnos por mes</li>
                  <li>• Gestión de servicios ilimitados</li>
                  <li>• Reservas online</li>
                  <li>• Panel de administración</li>
                </ul>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Registrando negocio...
                    </div>
                  ) : (
                    'Registrar Negocio Gratis'
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  ¿Ya tienes cuenta?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                  >
                    Inicia sesión aquí
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 mt-6">
          <p>
            Al registrarte, aceptas nuestros{' '}
            <a href="#" className="text-primary-600 hover:underline">
              Términos de Servicio
            </a>{' '}
            y{' '}
            <a href="#" className="text-primary-600 hover:underline">
              Política de Privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 