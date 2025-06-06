import React from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const Dashboard: React.FC = () => {
  const { user, business, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo size="sm" showText={true} />
              {business && (
                <div className="ml-6 text-sm text-gray-600">
                  {business.name}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Hola, {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Estadísticas */}
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
                    <p className="text-2xl font-semibold text-gray-900">12</p>
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
                    <p className="text-2xl font-semibold text-gray-900">48</p>
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
                    <p className="text-2xl font-semibold text-gray-900">$45,200</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <button className="card hover:shadow-md transition-shadow">
              <div className="card-body text-center">
                <div className="text-3xl mb-2">📝</div>
                <h3 className="font-medium text-gray-900">Nuevo Turno</h3>
                <p className="text-sm text-gray-600">Agendar cita</p>
              </div>
            </button>

            <button className="card hover:shadow-md transition-shadow">
              <div className="card-body text-center">
                <div className="text-3xl mb-2">⚙️</div>
                <h3 className="font-medium text-gray-900">Servicios</h3>
                <p className="text-sm text-gray-600">Gestionar servicios</p>
              </div>
            </button>

            <button className="card hover:shadow-md transition-shadow">
              <div className="card-body text-center">
                <div className="text-3xl mb-2">👥</div>
                <h3 className="font-medium text-gray-900">Clientes</h3>
                <p className="text-sm text-gray-600">Ver clientes</p>
              </div>
            </button>

            <button className="card hover:shadow-md transition-shadow">
              <div className="card-body text-center">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-medium text-gray-900">Reportes</h3>
                <p className="text-sm text-gray-600">Ver estadísticas</p>
              </div>
            </button>
          </div>

          {/* Próximos Turnos */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Próximos Turnos</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {/* Ejemplo de turno */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">JD</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Juan Pérez</p>
                      <p className="text-sm text-gray-600">Corte de cabello</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">14:30</p>
                    <p className="text-sm text-gray-600">Hoy</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-secondary-600">MG</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">María García</p>
                      <p className="text-sm text-gray-600">Manicura</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">16:00</p>
                    <p className="text-sm text-gray-600">Hoy</p>
                  </div>
                </div>
              </div>
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
                  <button className="btn-primary text-sm">
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 