import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscriptionService, type Plan } from '../services/subscriptionService';
import type { RegisterForm } from '../types';
import { BusinessType } from '../types';
import Logo from '../components/Logo';
import { Building2, Clock, Scissors, Heart, Stethoscope, Sparkles, Check, Crown, Zap } from 'lucide-react';

const Register: React.FC = () => {
  const [searchParams] = useSearchParams();
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
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<Plan[]>([]);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Cargar planes y detectar plan preseleccionado
  useEffect(() => {
    const loadPlansAndDetectSelection = async () => {
      try {
        // Cargar planes
        const response = await subscriptionService.getPlans();
        setPlans(response.data.plans);

        // Detectar plan preseleccionado desde URL
        const planKey = searchParams.get('plan');
        const billing = searchParams.get('billing') as 'monthly' | 'yearly';

        if (planKey) {
          const plan = response.data.plans.find(p => p.key === planKey);
          if (plan) {
            setSelectedPlan(plan);
            setSelectedBilling(billing || 'monthly');
          }
        } else {
          // Si no hay plan seleccionado, usar el gratuito por defecto
          const freePlan = response.data.plans.find(p => p.key === 'FREE');
          if (freePlan) {
            setSelectedPlan(freePlan);
          }
        }
      } catch (error) {
        console.error('Error cargando planes:', error);
        // Si falla, usar plan gratuito por defecto
        setSelectedPlan(null);
      }
    };

    loadPlansAndDetectSelection();
  }, [searchParams]);

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
      // 1. Registrar el negocio
      console.log('🔍 Datos del formulario a enviar:', formData);
      const registerResponse = await register(formData);
      console.log('✅ Registro exitoso:', registerResponse);
      
      // 2. Usar directamente los datos del registro (no esperar contexto)
      if (!registerResponse?.business?.id) {
        throw new Error('No se recibió el ID del negocio en la respuesta del registro');
      }
      
      const businessId = registerResponse.business.id;
      console.log('✅ BusinessId obtenido directamente del registro:', businessId);
      
      // 3. Si hay un plan seleccionado que no sea gratuito, crear suscripción
      console.log('🔍 Plan seleccionado:', selectedPlan);
      console.log('🔍 ¿Es plan gratuito?', selectedPlan?.key === 'FREE');
      
      if (selectedPlan && selectedPlan.key !== 'FREE') {
        console.log('🔄 Creando suscripción para plan:', selectedPlan.key);
        
        // Crear la suscripción
        const subscriptionResponse = await subscriptionService.createSubscription({
          businessId: businessId,
          planType: selectedPlan.key,
          billingCycle: selectedBilling === 'monthly' ? 'MONTHLY' : 'YEARLY'
        });

        console.log('✅ Suscripción creada:', subscriptionResponse);

        // Si requiere pago, crear el pago con MercadoPago
        if (subscriptionResponse.data.requiresPayment) {
          console.log('💳 Creando pago con MercadoPago...');
          
          const paymentResponse = await subscriptionService.createPayment({
            subscriptionId: subscriptionResponse.data.subscription.id
          });

          console.log('✅ Pago creado:', paymentResponse);

          // Redirigir a MercadoPago para completar el pago
          window.location.href = paymentResponse.data.initPoint;
          return; // No continuar con la navegación normal
        }
      }
      
      // 4. Si es plan gratuito o no requiere pago, ir al dashboard
      console.log('✅ Registro completado, redirigiendo al dashboard');
      console.log('🔍 Motivo: Plan gratuito o no requiere pago');
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('❌ Error en registro:', err);
      
      // Extraer información detallada del error
      let errorMessage = 'Error al registrar el negocio';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string; error?: string; errors?: string[]; details?: unknown } } };
        console.error('❌ Error response:', axiosError.response?.data);
        
        // Mostrar errores específicos si están disponibles
        if (axiosError.response?.data?.errors && Array.isArray(axiosError.response.data.errors)) {
          console.error('❌ Errores específicos:', axiosError.response.data.errors);
          errorMessage = `Error de validación: ${axiosError.response.data.errors.join(', ')}`;
        } else {
          errorMessage = axiosError.response?.data?.message || 
                        axiosError.response?.data?.error || 
                        'Error al registrar el negocio';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
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
                    placeholder="Ej: 11-1234-5678 o +54 9 11 1234-5678"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo 8 caracteres. Puedes usar números, espacios, guiones y paréntesis
                  </p>
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

              {/* Plan seleccionado */}
              {selectedPlan && (
                <div className={`border-2 rounded-lg p-6 ${
                  selectedPlan.key === 'FREE' 
                    ? 'bg-green-50 border-green-200' 
                    : selectedPlan.key === 'PREMIUM'
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {selectedPlan.key === 'FREE' && <Zap className="w-6 h-6 text-green-600" />}
                      {selectedPlan.key === 'PREMIUM' && <Crown className="w-6 h-6 text-purple-600" />}
                      <div>
                        <h3 className={`text-lg font-semibold ${
                          selectedPlan.key === 'FREE' ? 'text-green-800' : 
                          selectedPlan.key === 'PREMIUM' ? 'text-purple-800' : 'text-blue-800'
                        }`}>
                          Plan {selectedPlan.name}
                        </h3>
                        <p className="text-sm text-gray-600">{selectedPlan.description}</p>
                      </div>
                    </div>
                    
                    {selectedPlan.key !== 'FREE' && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${selectedPlan.pricing[selectedBilling].displayPrice.toLocaleString('es-AR')}
                        </div>
                        <div className="text-sm text-gray-600">
                          /{selectedBilling === 'monthly' ? 'mes' : 'mes'}
                        </div>
                        {selectedBilling === 'yearly' && 'savings' in selectedPlan.pricing.yearly && (
                          <div className="text-xs text-green-600 font-medium">
                            Ahorrás ${selectedPlan.pricing.yearly.savings.toLocaleString('es-AR')} al año
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Incluye:</h4>
                      <ul className="space-y-1">
                        {selectedPlan.features.slice(0, Math.ceil(selectedPlan.features.length / 2)).map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">&nbsp;</h4>
                      <ul className="space-y-1">
                        {selectedPlan.features.slice(Math.ceil(selectedPlan.features.length / 2)).map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {plans.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Link 
                        to="/#planes" 
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        ← Cambiar plan
                      </Link>
                    </div>
                  )}
                </div>
              )}

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
                  ) : selectedPlan?.key === 'FREE' ? (
                    'Registrar Negocio Gratis'
                  ) : selectedPlan ? (
                    `Continuar con Plan ${selectedPlan.name}`
                  ) : (
                    'Registrar Negocio'
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