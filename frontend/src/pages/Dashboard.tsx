import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../services/api';

interface DashboardStats {
  todayAppointments: number;
  totalClients: number;
  monthRevenue: number;
  totalServices: number;
  upcomingAppointments: Array<{
    id: string;
    clientName: string;
    serviceName: string;
    startTime: string;
    status: string;
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
      setStats(response.data);
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

  const copyBookingUrl = () => {
    if (business) {
      const url = `${window.location.origin}/book/${business.slug}`;
      navigator.clipboard.writeText(url);
      // TODO: Mostrar toast de confirmación
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Bienvenida */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Bienvenido de vuelta! 👋
        </h1>
        <p className="mt-1 text-gray-600">
          Aquí tienes un resumen de tu negocio
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  📅
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Turnos Hoy</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.todayAppointments || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                  👥
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clientes</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.totalClients || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  💰
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ingresos Mes</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(stats?.monthRevenue || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  ⚙️
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Servicios</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.totalServices || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/dashboard/appointments" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">📝</div>
            <h3 className="font-medium text-gray-900">Nuevo Turno</h3>
            <p className="text-sm text-gray-600">Agendar cita</p>
          </div>
        </Link>

        <Link to="/dashboard/services" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">⚙️</div>
            <h3 className="font-medium text-gray-900">Servicios</h3>
            <p className="text-sm text-gray-600">Gestionar servicios</p>
          </div>
        </Link>

        <Link to="/dashboard/clients" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="font-medium text-gray-900">Clientes</h3>
            <p className="text-sm text-gray-600">Ver clientes</p>
          </div>
        </Link>

        <Link to="/dashboard/reports" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-medium text-gray-900">Reportes</h3>
            <p className="text-sm text-gray-600">Ver estadísticas</p>
          </div>
        </Link>
      </div>

      {/* Próximos Turnos */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Próximos Turnos</h2>
        </div>
        <div className="card-body">
          {stats?.upcomingAppointments && stats.upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {stats.upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {appointment.clientName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{appointment.clientName}</p>
                      <p className="text-sm text-gray-600">{appointment.serviceName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(appointment.startTime)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(appointment.startTime).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <p className="text-gray-600">No hay turnos próximos</p>
              <p className="text-sm text-gray-500 mt-1">
                Los nuevos turnos aparecerán aquí
              </p>
            </div>
          )}
        </div>
      </div>

      {/* URL Pública */}
      {business && (
        <div className="mt-8 card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Tu URL de Reservas</h2>
          </div>
          <div className="card-body">
            <p className="text-sm text-gray-600 mb-2">
              Comparte esta URL para que tus clientes puedan reservar turnos online:
            </p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm">
                {window.location.origin}/book/{business.slug}
              </code>
              <button 
                onClick={copyBookingUrl}
                className="btn-primary text-sm"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 