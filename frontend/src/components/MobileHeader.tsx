import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Menu, Bell, Search, Settings, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  const { user, business, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleSettings = () => {
    setShowUserMenu(false);
    navigate('/dashboard/settings');
  };

  const handleProfile = () => {
    setShowUserMenu(false);
    navigate('/dashboard/settings');
  };

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
          
          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={handleUserMenuClick}
              className="user-avatar-button flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors touch-manipulation"
              aria-label="Menú de usuario"
            >
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-purple-600">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <ChevronDown 
                size={16} 
                className={`text-gray-400 transition-transform duration-200 ${
                  showUserMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <>
                {/* Overlay */}
                <div 
                  className="user-menu-overlay fixed inset-0 z-[998] bg-black bg-opacity-25 backdrop-blur-sm"
                  onClick={() => setShowUserMenu(false)}
                />
                
                {/* Menu */}
                <div className="user-menu-dropdown absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-[999] overflow-hidden">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-purple-600">
                          {user?.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    {business && (
                      <div className="mt-2 px-2 py-1 bg-purple-100 rounded-md">
                        <p className="text-xs text-purple-700 font-medium truncate">
                          {business.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      onClick={handleProfile}
                      className="user-menu-item w-full flex items-center px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation"
                    >
                      <User size={18} className="mr-3 text-gray-400" />
                      Mi Perfil
                    </button>
                    
                    <button
                      onClick={handleSettings}
                      className="user-menu-item w-full flex items-center px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation"
                    >
                      <Settings size={18} className="mr-3 text-gray-400" />
                      Configuración
                    </button>
                    
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="user-menu-item danger w-full flex items-center px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors touch-manipulation"
                      >
                        <LogOut size={18} className="mr-3 text-red-400" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader; 