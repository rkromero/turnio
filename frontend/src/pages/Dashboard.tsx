import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../services/api';
import { Calendar, Users, DollarSign, Settings, Plus, Copy, ExternalLink } from 'lucide-react';
import ClientStarRating from '../components/ClientStarRating';
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
      } catch (error) {
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
      <div className="section-container section-padding">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header de bienvenida */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          ¡Bienvenido de vuelta! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          Aquí tienes un resumen de tu negocio <span className="font-medium">{business?.name}</span>
        </p>
      </div>

      {/* URL de reservas públicas */}
      {business && (
        <div className="info-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                <ExternalLink className="w-4 h-4 mr-2" />
                Enlace de Reservas Públicas
              </h3>
              <p className="text-sm text-blue-800 break-all">
                {window.location.origin}/book/{business.slug}
              </p>
            </div>
            <button
              onClick={copyBookingUrl}
              className="btn-secondary flex items-center space-x-2 w-full sm:w-auto justify-center"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar URL</span>
            </button>
          </div>
        </div>
      )}

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="stats-card group">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Turnos Hoy</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {stats?.todayAppointments || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date().toLocaleDateString('es-AR')}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="stats-card group">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Clientes</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {stats?.totalClients || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Registrados</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stats-card group">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Ingresos Mes</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatCurrency(stats?.monthRevenue || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date().toLocaleDateString('es-AR', { month: 'long' })}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="stats-card group">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Servicios</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {stats?.totalServices || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Activos</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Settings className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-purple-600" />
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            to="/dashboard/appointments" 
            className="card-modern hover-lift text-center group"
          >
            <div className="card-body">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">📝</div>
              <h3 className="font-semibold text-gray-900 mb-1">Nuevo Turno</h3>
              <p className="text-sm text-gray-600">Agendar cita</p>
            </div>
          </Link>

          <Link 
            to="/dashboard/services" 
            className="card-modern hover-lift text-center group"
          >
            <div className="card-body">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">⚙️</div>
              <h3 className="font-semibold text-gray-900 mb-1">Servicios</h3>
              <p className="text-sm text-gray-600">Gestionar servicios</p>
            </div>
          </Link>

          <Link 
            to="/dashboard/clients" 
            className="card-modern hover-lift text-center group"
          >
            <div className="card-body">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">👥</div>
              <h3 className="font-semibold text-gray-900 mb-1">Clientes</h3>
              <p className="text-sm text-gray-600">Ver clientes</p>
            </div>
          </Link>

          <Link 
            to="/dashboard/reports" 
            className="card-modern hover-lift text-center group"
          >
            <div className="card-body">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">📊</div>
              <h3 className="font-semibold text-gray-900 mb-1">Reportes</h3>
              <p className="text-sm text-gray-600">Ver estadísticas</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Próximos Turnos */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Próximos Turnos</h2>
            <Link 
              to="/dashboard/appointments" 
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Ver todos
            </Link>
          </div>
        </div>
        <div className="card-body">
          {stats?.upcomingAppointments && stats.upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {stats.upcomingAppointments.slice(0, 5).map((appointment) => (
                <div 
                  key={appointment.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-600">
                          {appointment.clientName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {appointment.clientName}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {appointment.serviceName}
                      </p>
                      {appointment.clientScore?.hasScore && (
                        <div className="mt-1">
                          <ClientStarRating
                            starRating={appointment.clientScore.starRating}
                            totalBookings={appointment.clientScore.totalBookings}
                            attendedCount={appointment.clientScore.attendedCount}
                            noShowCount={appointment.clientScore.noShowCount}
                            showDetails={false}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">
                        {formatTime(appointment.startTime)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDate(appointment.startTime)}
                      </p>
                    </div>
                    <span className={`badge ${getStatusColor(appointment.status)} text-xs`}>
                      {getStatusLabel(appointment.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <p className="text-gray-600 mb-4">No hay turnos próximos programados</p>
              <Link to="/dashboard/appointments" className="btn-primary">
                Programar Turno
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Links útiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="info-card">
          <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
            <span className="text-lg mr-2">💡</span>
            Consejo del día
          </h3>
          <p className="text-sm text-blue-800 leading-relaxed">
            Mantén actualizados los horarios de trabajo de tu equipo para optimizar la gestión de turnos.
          </p>
          <Link 
            to="/dashboard/settings" 
            className="text-sm text-blue-700 hover:text-blue-800 font-medium mt-2 inline-block"
          >
            Configurar horarios →
          </Link>
        </div>

        <div className="success-card">
          <h3 className="text-sm font-medium text-green-900 mb-2 flex items-center">
            <span className="text-lg mr-2">🚀</span>
            Mejora tu negocio
          </h3>
          <p className="text-sm text-green-800 leading-relaxed">
            Revisa los reportes para identificar oportunidades de crecimiento y optimización.
          </p>
          <Link 
            to="/dashboard/reports" 
            className="text-sm text-green-700 hover:text-green-800 font-medium mt-2 inline-block"
          >
            Ver reportes →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 