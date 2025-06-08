import React from 'react';
import { Star, User, AlertTriangle } from 'lucide-react';

interface ClientStarRatingProps {
  starRating: number | null;
  totalBookings?: number;
  attendedCount?: number;
  noShowCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

const ClientStarRating: React.FC<ClientStarRatingProps> = ({
  starRating,
  totalBookings = 0,
  attendedCount = 0,
  noShowCount = 0,
  size = 'md',
  showDetails = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const getBadgeColor = (rating: number | null) => {
    if (rating === null) return 'bg-gray-100 text-gray-600';
    if (rating <= 2) return 'bg-red-100 text-red-700';
    if (rating <= 3) return 'bg-yellow-100 text-yellow-700';
    if (rating <= 4) return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
  };

  const renderStars = () => {
    if (starRating === null) {
      return (
        <div className={`flex items-center space-x-1 ${textSizeClasses[size]}`}>
          <User className={`${sizeClasses[size]} text-gray-400`} />
          <span className="text-gray-500">Sin scoring</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`${sizeClasses[size]} ${
                star <= starRating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className={`font-medium ${textSizeClasses[size]}`}>
          {starRating}/5
        </span>
      </div>
    );
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      {/* Badge principal con estrellas */}
      <div className={`
        px-2 py-1 rounded-lg flex items-center space-x-2 
        ${getBadgeColor(starRating)}
        ${textSizeClasses[size]}
      `}>
        {renderStars()}
        
        {/* Icono de advertencia para ratings bajos */}
        {starRating !== null && starRating <= 2 && (
          <AlertTriangle className={`${sizeClasses[size]} text-red-500`} />
        )}
      </div>

      {/* Detalles adicionales */}
      {showDetails && starRating !== null && (
        <div className={`ml-2 ${textSizeClasses[size]} text-gray-600`}>
          <span className="hidden sm:inline">
            {attendedCount}/{totalBookings} citas
          </span>
          {noShowCount > 0 && (
            <span className="ml-1 text-red-600 font-medium">
              ({noShowCount} no-show)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Componente tooltip para mostrar más información
export const ClientRatingTooltip: React.FC<{
  starRating: number | null;
  totalBookings: number;
  attendedCount: number;
  noShowCount: number;
}> = ({ starRating, totalBookings, attendedCount, noShowCount }) => {
  if (starRating === null) {
    return (
      <div className="text-sm">
        <p className="font-medium text-gray-900">Cliente nuevo</p>
        <p className="text-gray-600">Sin historial de reservas</p>
      </div>
    );
  }

  const attendanceRate = totalBookings > 0 ? Math.round((attendedCount / totalBookings) * 100) : 0;

  return (
    <div className="text-sm space-y-2">
      <div>
        <p className="font-medium text-gray-900">Historial del cliente</p>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= starRating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
          <span className="ml-2 font-medium">{starRating}/5</span>
        </div>
      </div>
      
      <div className="space-y-1 text-gray-600">
        <p>• Total de reservas: {totalBookings}</p>
        <p>• Asistencias: {attendedCount} ({attendanceRate}%)</p>
        {noShowCount > 0 && (
          <p className="text-red-600">• No-shows: {noShowCount}</p>
        )}
      </div>
      
      <p className="text-xs text-gray-500 italic">
        Basado en historial global del cliente
      </p>
    </div>
  );
};

export default ClientStarRating; 