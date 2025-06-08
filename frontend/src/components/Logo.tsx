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
    dark: 'text-gray-900',
    light: 'text-white'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Icono del logo - A estilizada en círculo púrpura */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg`}>
        <svg
          viewBox="0 0 24 24"
          className="w-3/5 h-3/5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          {/* Letra A estilizada */}
          <path 
            d="M12 4L8 20M16 20L12 4M9.5 14h5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
      
      {/* Texto del logo */}
      {showText && (
        <span className={`font-bold tracking-wide ${textSizeClasses[size]} ${textColorClasses[textColor]}`}>
          TURNIO
        </span>
      )}
    </div>
  );
};

export default Logo; 