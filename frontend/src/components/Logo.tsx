import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  textColor?: 'dark' | 'light';
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showText = true, 
  className = '', 
  textColor = 'dark' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  const textColorClasses = {
    dark: 'text-gray-800',
    light: 'text-white'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Icono oficial de Turnio */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-purple-400 to-purple-500 rounded-3xl flex items-center justify-center shadow-lg`}>
        <svg
          viewBox="0 0 32 32"
          className="w-3/5 h-3/5 text-black"
          fill="currentColor"
          stroke="none"
        >
          {/* Forma A estilizada como en el logo oficial */}
          <path 
            d="M16 6 L24 24 L20 24 L18.5 20 L13.5 20 L12 24 L8 24 L16 6 Z M15 14 L17 14 L16 11 L15 14 Z" 
            fillRule="evenodd"
          />
        </svg>
      </div>
      
      {/* Texto del logo */}
      {showText && (
        <span className={`font-black tracking-wider ${textSizeClasses[size]} ${textColorClasses[textColor]} uppercase`}>
          TURNIO
        </span>
      )}
    </div>
  );
};

export default Logo; 