import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import MobileNavigation from './MobileNavigation';
import MobileHeader from './MobileHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, business, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleBack = () => {
    navigate(-1);
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Servicios', href: '/dashboard/services', icon: '⚙️' },
    { name: 'Turnos', href: '/dashboard/appointments', icon: '📅' },
    { name: 'Clientes', href: '/dashboard/clients', icon: '👥' },
    { name: 'Reseñas', href: '/dashboard/reviews', icon: '⭐' },
    { name: 'Usuarios', href: '/dashboard/users', icon: '👤' },
    { name: 'Sucursales', href: '/dashboard/branches', icon: '🏢' },
    { name: 'Reportes', href: '/dashboard/reports', icon: '📈' },
    { name: 'Configuraciones', href: '/dashboard/settings', icon: '🔧' },
    { name: 'Prueba Plan', href: '/dashboard/plan-test', icon: '🧪' },
  ];

  // Determinar el título de la página actual
  const getPageTitle = () => {
    const currentItem = navigationItems.find(item => 
      location.pathname === item.href || 
      (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
    );
    return currentItem?.name;
  };

  // Determinar si mostrar botón de volver
  const showBackButton = () => {
    return location.pathname !== '/dashboard';
  };

  return (
    <>
      {/* Desktop Layout */}
      <div className="desktop-only min-h-screen bg-gray-50">
        {/* Desktop Header */}
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

        {/* Desktop Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Desktop Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="mobile-only">
        {/* Mobile Header */}
        <MobileHeader
          title={getPageTitle()}
          showBack={showBackButton()}
          showNotifications={true}
          onBack={handleBack}
          onNotificationClick={() => {
            // TODO: Implementar notificaciones
            console.log('Notificaciones clicked');
          }}
        />

        {/* Mobile Container */}
        <div className="mobile-container">
          <div className="mobile-content">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNavigation />

        {/* Mobile Menu Overlay (para futuras implementaciones) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 mobile-only">
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <Logo size="sm" showText={true} />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <nav className="space-y-2">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </nav>
                
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="w-full btn-secondary"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DashboardLayout; 