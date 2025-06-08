import React from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { UrgencyStats } from '../types/booking';

interface UrgencyBadgeProps {
  urgency: UrgencyStats;
  className?: string;
}

const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency, className = '' }) => {
  const getUrgencyIcon = () => {
    switch (urgency.urgencyLevel) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Clock className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getUrgencyStyles = () => {
    switch (urgency.urgencyLevel) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-green-50 text-green-700 border-green-200';
    }
  };

  if (urgency.availableSlots === 0) {
    return (
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border bg-gray-50 text-gray-600 border-gray-200 ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">{urgency.urgencyMessage}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${getUrgencyStyles()} ${className}`}>
      {getUrgencyIcon()}
      <div className="flex-1">
        <span className="text-sm font-medium">{urgency.urgencyMessage}</span>
        {urgency.occupancy !== undefined && urgency.urgencyLevel !== 'low' && (
          <div className="text-xs mt-1 opacity-80">
            {urgency.occupancy}% de ocupación
          </div>
        )}
      </div>
      {urgency.urgencyLevel === 'high' && (
        <div className="text-xs bg-white bg-opacity-30 px-2 py-1 rounded-full">
          🔥 ¡Popular!
        </div>
      )}
    </div>
  );
};

export default UrgencyBadge; 