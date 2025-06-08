import React from 'react';
import ToastComponent, { Toast } from './Toast';
import { useIsMobileSimple } from '../hooks/useIsMobile';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const isMobile = useIsMobileSimple();

  if (toasts.length === 0) return null;

  return (
    <div
      className={`
        fixed z-[9999] pointer-events-none
        ${isMobile 
          ? 'top-0 left-0 right-0 pt-safe-area-top' 
          : 'top-4 right-4'
        }
      `}
    >
      <div className={`
        flex flex-col space-y-2
        ${isMobile ? 'pt-2' : ''}
      `}>
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="pointer-events-auto"
            style={{
              zIndex: 9999 - index
            }}
          >
            <ToastComponent
              toast={toast}
              onDismiss={onDismiss}
              isMobile={isMobile}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToastContainer; 