import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../services/api';
import { Calendar, Users, DollarSign, Settings, Plus, Copy, ExternalLink, ChevronRight } from 'lucide-react';
import ClientStarRating from '../components/ClientStarRating';
import FloatingActionButton from '../components/FloatingActionButton';
import { useIsMobileSimple } from '../hooks/useIsMobile';
import toast from 'react-hot-toast';

interface DashboardStats {
  todayAppointments: number;
  totalClients: number;
  monthRevenue: number;
  totalServices: number;
  upcomingAppointments: Array<{
    id: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    serviceName: string;
    startTime: string;
    status: string;
    clientScore?: {
      hasScore: boolean;
      starRating: number | null;
      totalBookings: number;
      attendedCount: number;
      noShowCount: number;
    };
  }>;
}

const Dashboard: React.FC = () => {
  const { business } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobileSimple();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getStats();
      const statsData = response.data;
      
      // Cargar scoring para cada cita próxima
      if (statsData.upcomingAppointments && statsData.upcomingAppointments.length > 0) {
        const appointmentsWithScoring = await Promise.all(
          statsData.upcomingAppointments.map(async (appointment: typeof statsData.upcomingAppointments[0]) => {
            try {
              if (appointment.clientEmail || appointment.clientPhone) {
                const params = new URLSearchParams();
                if (appointment.clientEmail) params.append('email', appointment.clientEmail);
                if (appointment.clientPhone) params.append('phone', appointment.clientPhone);
                
                const scoreResponse = await fetch(`https://turnio-backend-production.up.railway.app/api/client-scoring/score?${params.toString()}`);
                const scoreData = await scoreResponse.json();
                
                if (scoreData.success) {
                  return {
                    ...appointment,
                    clientScore: scoreData.data
                  };
                }
              }
              return appointment;
            } catch (err) {
              console.error('Error cargando scoring para cita:', err);
              return appointment;
            }
          })
        );
        
        statsData.upcomingAppointments = appointmentsWithScoring;
      }
      
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const copyBookingUrl = async () => {
    if (business) {
      const url = `${window.location.origin}/book/${business.slug}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('URL de reservas copiada al portapapeles');
      } catch {
        toast.error('Error al copiar la URL');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'NO_SHOW':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      CONFIRMED: 'Confirmada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No asistió'
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="loading-spinner-mobile mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header de bienvenida - Optimizado para móvil */}
        <div className="text-center md:text-left">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">
            ¡Bienvenido! 👋
          </h1>
          <p className="mt-1 text-sm md:text-base text-gray-600">
            {isMobile ? business?.name : `Aquí tienes un resumen de tu negocio ${business?.name}`}
          </p>
        </div>

        {/* URL de reservas públicas - Compacta en móvil */}
        {business && (
          <div className="info-card">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-blue-900 flex items-center">
                <ExternalLink className="w-4 h-4 mr-2" />
                {isMobile ? 'Enlace de Reservas' : 'Enlace de Reservas Públicas'}
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <p className="text-xs sm:text-sm text-blue-800 break-all flex-1 bg-blue-50 p-2 rounded">
                  {window.location.origin}/book/{business.slug}
                </p>
                <button
                  onClick={copyBookingUrl}
                  className="btn-secondary text-sm py-2 px-4 flex items-center justify-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas principales - Grid responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <div className="stats-card group overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1 truncate">
                  {isMobile ? 'Hoy' : 'Turnos Hoy'}
                </p>
                <p className="text-xl md:text-3xl font-bold text-gray-900 truncate">
                  {stats?.todayAppointments || 0}
                </p>
                {!isMobile && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {new Date().toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>
              <div className="w-8 h-8 md:w-12 md:h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 mt-2 md:mt-0 self-end md:self-auto flex-shrink-0">
                <Calendar className="w-4 h-4 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="stats-card group overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1 truncate">
                  {isMobile ? 'Clientes' : 'Total Clientes'}
                </p>
                <p className="text-xl md:text-3xl font-bold text-gray-900 truncate">
                  {stats?.totalClients || 0}
                </p>
                {!isMobile && (
                  <p className="text-xs text-gray-500 mt-1 truncate">Registrados</p>
                )}
              </div>
              <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 mt-2 md:mt-0 self-end md:self-auto flex-shrink-0">
                <Users className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="stats-card group overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1 truncate">
                  {isMobile ? 'Ingresos' : 'Ingresos Mes'}
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                  {isMobile 
                    ? `$${Math.round((stats?.monthRevenue || 0) / 1000)}k`
                    : formatCurrency(stats?.monthRevenue || 0)
                  }
                </p>
                {!isMobile && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {new Date().toLocaleDateString('es-AR', { month: 'long' })}
                  </p>
                )}
              </div>
              <div className="w-8 h-8 md:w-12 md:h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 mt-2 md:mt-0 self-end md:self-auto flex-shrink-0">
                <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="stats-card group overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 mb-1 truncate">Servicios</p>
                <p className="text-xl md:text-3xl font-bold text-gray-900 truncate">
                  {stats?.totalServices || 0}
                </p>
                {!isMobile && (
                  <p className="text-xs text-gray-500 mt-1 truncate">Activos</p>
                )}
              </div>
              <div className="w-8 h-8 md:w-12 md:h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 mt-2 md:mt-0 self-end md:self-auto flex-shrink-0">
                <Settings className="w-4 h-4 md:w-6 md:h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas - Optimizadas para móvil */}
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-purple-600" />
            {isMobile ? 'Acciones' : 'Acciones Rápidas'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Link 
              to="/dashboard/appointments" 
              className="card-mobile text-center group p-4"
            >
              <div className="text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">📝</div>
              <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                {isMobile ? 'Turno' : 'Nuevo Turno'}
              </h3>
              <p className="text-xs text-gray-600">Agendar cita</p>
            </Link>

            <Link 
              to="/dashboard/services" 
              className="card-mobile text-center group p-4"
            >
              <div className="text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">⚙️</div>
              <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">Servicios</h3>
              <p className="text-xs text-gray-600">Gestionar</p>
            </Link>

            <Link 
              to="/dashboard/clients" 
              className="card-mobile text-center group p-4"
            >
              <div className="text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">👥</div>
              <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">Clientes</h3>
              <p className="text-xs text-gray-600">Ver lista</p>
            </Link>

            <Link 
              to="/dashboard/reports" 
              className="card-mobile text-center group p-4"
            >
              <div className="text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">📊</div>
              <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">Reportes</h3>
              <p className="text-xs text-gray-600">Estadísticas</p>
            </Link>
          </div>
        </div>

        {/* Próximos Turnos - Lista optimizada para móvil */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {isMobile ? 'Próximos' : 'Próximos Turnos'}
              </h2>
              <Link 
                to="/dashboard/appointments" 
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center"
              >
                Ver todos
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
          <div className="card-body p-0">
            {stats?.upcomingAppointments && stats.upcomingAppointments.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {stats.upcomingAppointments.slice(0, isMobile ? 3 : 5).map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="p-4 hover:bg-gray-50 transition-colors duration-200 touch-manipulation"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-purple-600">
                            {appointment.clientName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {appointment.clientName}
                          </p>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="text-xs font-medium text-gray-900">
                              {formatTime(appointment.startTime)}
                            </span>
                            <span className={`badge ${getStatusColor(appointment.status)} text-xs`}>
                              {isMobile ? appointment.status.slice(0, 3) : getStatusLabel(appointment.status)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {appointment.serviceName}
                        </p>
                        {!isMobile && (
                          <p className="text-xs text-gray-500">
                            {formatDate(appointment.startTime)}
                          </p>
                        )}
                        {appointment.clientScore?.hasScore && (
                          <div className="mt-2">
                            <ClientStarRating
                              starRating={appointment.clientScore.starRating}
                              totalBookings={appointment.clientScore.totalBookings}
                              attendedCount={appointment.clientScore.attendedCount}
                              noShowCount={appointment.clientScore.noShowCount}
                              size="sm"
                              showLabel={!isMobile}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📅</div>
                <p className="text-gray-600 mb-4">
                  {isMobile ? 'No hay turnos próximos' : 'No hay turnos próximos programados'}
                </p>
                <Link to="/dashboard/appointments" className="btn-primary">
                  {isMobile ? 'Programar' : 'Programar Turno'}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Consejo del día - Solo en desktop */}
        {!isMobile && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="info-card">
              <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                <span className="text-lg mr-2">💡</span>
                Consejo del día
              </h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                Mantén actualizados los horarios de trabajo de tu equipo para optimizar la gestión de turnos.
              </p>
            </div>
            <div className="success-card">
              <h3 className="text-sm font-medium text-green-900 mb-2 flex items-center">
                <span className="text-lg mr-2">🎯</span>
                Meta del mes
              </h3>
              <p className="text-sm text-green-800 leading-relaxed">
                ¡Vas por buen camino! Sigue así para alcanzar tus objetivos mensuales.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FAB para móvil - Nuevo turno */}
      {isMobile && (
        <FloatingActionButton
          icon={Plus}
          onClick={() => window.location.href = '/dashboard/appointments'}
          ariaLabel="Nuevo turno"
        />
      )}
    </>
  );
};

export default Dashboard; 