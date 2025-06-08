import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  BarChart3
} from 'lucide-react';

interface MobileNavigationProps {
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className = '' }) => {
  const location = useLocation();

  const navigationItems = [
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
    },
    { 
      name: 'Más', 
      href: '/dashboard/settings', 
      icon: Settings,
      exactMatch: false
    }
  ];

  const isActive = (item: typeof navigationItems[0]) => {
    if (item.exactMatch) {
      return location.pathname === item.href;
    }
    return location.pathname.startsWith(item.href);
  };

  return (
    <nav className={`mobile-bottom-nav ${className}`}>
      <div className="flex items-center justify-around h-full">
        {navigationItems.map((item) => {
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
      </div>
    </nav>
  );
};

export default MobileNavigation; 