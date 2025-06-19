import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  BarChart3,
  Star,
  UserCog,
  Building2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface MobileNavigationProps {
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className = '' }) => {
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainNavigationItems = [
    { 
      name: 'Inicio', 
      href: '/dashboard', 
      icon: Home,
      exactMatch: true
    },
    { 
      name: 'Turnos', 
      href: '/dashboard/appointments', 
      icon: Calendar,
      exactMatch: false
    },
    { 
      name: 'Clientes', 
      href: '/dashboard/clients', 
      icon: Users,
      exactMatch: false
    },
    { 
      name: 'Reportes', 
      href: '/dashboard/reports', 
      icon: BarChart3,
      exactMatch: false
    }
  ];

  const moreMenuItems = [
    {
      name: 'Reseñas',
      href: '/dashboard/reviews',
      icon: Star,
      exactMatch: false
    },
    {
      name: 'Usuarios',
      href: '/dashboard/users',
      icon: UserCog,
      exactMatch: false
    },
    {
      name: 'Sucursales',
      href: '/dashboard/branches',
      icon: Building2,
      exactMatch: false
    },
    {
      name: 'Configuración',
      href: '/dashboard/settings',
      icon: Settings,
      exactMatch: false
    }
  ];

  const isActive = (item: typeof mainNavigationItems[0]) => {
    if (item.exactMatch) {
      return location.pathname === item.href;
    }
    return location.pathname.startsWith(item.href);
  };

  const isMoreMenuActive = () => {
    return moreMenuItems.some(item => isActive(item));
  };

  const handleMoreClick = () => {
    setShowMoreMenu(!showMoreMenu);
  };

  const handleMenuItemClick = () => {
    setShowMoreMenu(false);
  };

  return (
    <div className="relative">
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-25 backdrop-blur-sm"
          onClick={() => setShowMoreMenu(false)}
        />
      )}
      
      {/* More Menu */}
      {showMoreMenu && (
        <div className="absolute bottom-full left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl">
          <div className="safe-area-bottom pb-4">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">Más opciones</h3>
            </div>
            <div className="py-2">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={handleMenuItemClick}
                    className={`flex items-center px-6 py-4 transition-colors touch-manipulation ${
                      active 
                        ? 'bg-purple-50 text-purple-700 border-r-4 border-purple-600' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon 
                      size={20} 
                      className={`mr-3 ${active ? 'text-purple-600' : 'text-gray-500'}`} 
                    />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className={`mobile-bottom-nav ${className}`}>
        <div className="flex items-center justify-around h-full">
          {/* Main Navigation Items */}
          {mainNavigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`mobile-nav-item ${active ? 'active' : ''}`}
              >
                <Icon 
                  size={24} 
                  className={`mobile-nav-icon ${
                    active ? 'text-purple-600' : 'text-gray-500'
                  }`} 
                />
                <span className={`mobile-nav-label ${
                  active ? 'text-purple-600' : 'text-gray-500'
                }`}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={handleMoreClick}
            className={`mobile-nav-item ${isMoreMenuActive() || showMoreMenu ? 'active' : ''}`}
          >
            <div className="relative">
              {showMoreMenu ? (
                <ChevronDown 
                  size={24} 
                  className={`mobile-nav-icon ${
                    isMoreMenuActive() || showMoreMenu ? 'text-purple-600' : 'text-gray-500'
                  }`} 
                />
              ) : (
                <ChevronUp 
                  size={24} 
                  className={`mobile-nav-icon ${
                    isMoreMenuActive() || showMoreMenu ? 'text-purple-600' : 'text-gray-500'
                  }`} 
                />
              )}
              {/* Active indicator dot */}
              {isMoreMenuActive() && !showMoreMenu && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-600 rounded-full"></div>
              )}
            </div>
            <span className={`mobile-nav-label ${
              isMoreMenuActive() || showMoreMenu ? 'text-purple-600' : 'text-gray-500'
            }`}>
              Más
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default MobileNavigation; 