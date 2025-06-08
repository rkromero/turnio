import React, { useEffect, useState } from 'react';
import { Check, X, AlertTriangle, Info, XIcon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  isMobile?: boolean;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onDismiss, isMobile = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Entrada con delay para animación
    const timer = setTimeout(() => setIsVisible(true), 10);
    
    // Auto-dismiss
    if (toast.duration && toast.duration > 0) {
      const dismissTimer = setTimeout(() => {
        handleDismiss();
      }, toast.duration);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(dismissTimer);
      };
    }
    
    return () => clearTimeout(timer);
  }, [toast.duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  };

  const getIcon = () => {
    const iconProps = {
      className: "w-5 h-5 flex-shrink-0"
    };

    switch (toast.type) {
      case 'success':
        return <Check {...iconProps} />;
      case 'error':
        return <X {...iconProps} />;
      case 'warning':
        return <AlertTriangle {...iconProps} />;
      case 'info':
        return <Info {...iconProps} />;
      default:
        return <Info {...iconProps} />;
    }
  };

  const getStyles = () => {
    const baseStyles = `
      ${isMobile ? 'mx-4' : 'w-96'} 
      rounded-lg shadow-lg border backdrop-blur-sm
      transform transition-all duration-200 ease-out
      ${isVisible && !isExiting 
        ? 'translate-y-0 opacity-100' 
        : isExiting 
          ? 'translate-y-[-100%] opacity-0'
          : 'translate-y-[-100%] opacity-0'
      }
    `;

    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800`;
    }
  };

  const getIconColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={getStyles()}>
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className={getIconColor()}>
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">{toast.title}</h4>
            {toast.message && (
              <p className="mt-1 text-sm opacity-90">{toast.message}</p>
            )}
            
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className="text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 text-current opacity-60 hover:opacity-100 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current touch-manipulation"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToastComponent; 