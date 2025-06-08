import React from 'react';
import { ArrowLeft, Menu, Bell, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  showSearch?: boolean;
  onBack?: () => void;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  onSearchClick?: () => void;
  className?: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBack = false,
  showMenu = false,
  showNotifications = false,
  showSearch = false,
  onBack,
  onMenuClick,
  onNotificationClick,
  onSearchClick,
  className = ''
}) => {
  const { user, business } = useAuth();

  return (
    <header className={`mobile-header ${className}`}>
      <div className="flex items-center justify-between h-full px-4">
        {/* Left Section */}
        <div className="flex items-center space-x-3">
          {showBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 touch-manipulation"
              aria-label="Volver"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          
          {showMenu && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 touch-manipulation"
              aria-label="Menú"
            >
              <Menu size={24} />
            </button>
          )}
          
          {!showBack && !showMenu && (
            <Logo size="sm" showText={false} />
          )}
          
          {title && (
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-gray-900 line-clamp-1">
                {title}
              </h1>
              {business && (
                <span className="text-xs text-gray-500 line-clamp-1">
                  {business.name}
                </span>
              )}
            </div>
          )}
          
          {!title && business && (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 line-clamp-1">
                {business.name}
              </span>
              <span className="text-xs text-gray-500">
                Hola, {user?.name}
              </span>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {showSearch && (
            <button
              onClick={onSearchClick}
              className="p-2 text-gray-600 hover:text-gray-900 touch-manipulation"
              aria-label="Buscar"
            >
              <Search size={20} />
            </button>
          )}
          
          {showNotifications && (
            <button
              onClick={onNotificationClick}
              className="relative p-2 text-gray-600 hover:text-gray-900 touch-manipulation"
              aria-label="Notificaciones"
            >
              <Bell size={20} />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          )}
          
          {/* User Avatar */}
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-purple-600">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader; 