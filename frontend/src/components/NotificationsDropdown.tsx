import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, XCircle, Check, Loader } from 'lucide-react';
import { notificationService } from '../services/api';
import { appointmentService } from '../services/api';
import type { InAppNotification } from '../types';
import toast from 'react-hot-toast';

interface NotificationsDropdownProps {
  onClose?: () => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await notificationService.getNotifications(false); // Solo no leídas
      setNotifications(response.data);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      toast.error('Error al cargar notificaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAttendance = async (notificationId: string, appointmentId: string, status: 'COMPLETED' | 'NO_SHOW') => {
    try {
      setUpdating(notificationId);
      
      // Actualizar el turno
      await appointmentService.updateAppointment(appointmentId, { status });
      
      // Marcar notificación como leída
      await notificationService.markAsRead(notificationId);
      
      // Remover de la lista local
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      toast.success(status === 'COMPLETED' ? '✅ Marcado como asistió' : '❌ Marcado como no asistió');
    } catch (error) {
      console.error('Error actualizando turno:', error);
      toast.error('Error al actualizar el turno');
    } finally {
      setUpdating(null);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marcando como leída:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
      toast.error('Error al marcar como leídas');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  return (
    <>
      {/* Overlay para móvil */}
      <div 
        className="fixed inset-0 z-[998] bg-black bg-opacity-25 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div 
        ref={dropdownRef}
        className="notification-dropdown absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-[999] max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {unreadCount}
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Notificaciones */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 text-purple-600 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No hay notificaciones</p>
              <p className="text-sm text-gray-500 mt-1">
                Te notificaremos cuando terminen tus turnos
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map(notification => (
                <li key={notification.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                      
                      {/* Botones de acción para evaluación de turno */}
                      {notification.type === 'EVALUATE_APPOINTMENT' && notification.appointmentId && (
                        <div className="flex space-x-2 mt-3">
                          <button
                            onClick={() => handleMarkAttendance(notification.id, notification.appointmentId!, 'COMPLETED')}
                            disabled={updating === notification.id}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updating === notification.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                Asistió
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(notification.id, notification.appointmentId!, 'NO_SHOW')}
                            disabled={updating === notification.id}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updating === notification.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-1.5" />
                                No Asistió
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Botón para marcar como leída (solo si no tiene acciones) */}
                    {notification.type !== 'EVALUATE_APPOINTMENT' && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Marcar como leída"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsDropdown;

