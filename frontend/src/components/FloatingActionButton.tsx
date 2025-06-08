import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FloatingActionButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
  ariaLabel?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon: Icon,
  onClick,
  className = '',
  size = 'md',
  color = 'primary',
  disabled = false,
  ariaLabel = 'Acción rápida'
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12 p-3',
    md: 'w-14 h-14 p-4',
    lg: 'w-16 h-16 p-5'
  };

  const colorClasses = {
    primary: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-purple-500/25',
    secondary: 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white shadow-gray-500/25',
    success: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-green-500/25',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-red-500/25'
  };

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 28
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        fixed bottom-20 right-4 z-50
        ${sizeClasses[size]}
        ${colorClasses[color]}
        rounded-full shadow-lg hover:shadow-xl
        transition-all duration-300 ease-out
        transform hover:scale-110 active:scale-95
        touch-manipulation
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${className}
      `}
    >
      <Icon size={iconSizes[size]} />
    </button>
  );
};

export default FloatingActionButton; 