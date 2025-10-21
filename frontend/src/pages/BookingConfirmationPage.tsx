import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, User, Briefcase, MapPin, Home } from 'lucide-react';
import Logo from '../components/Logo';

interface ConfirmationData {
  appointmentId: string;
  clientName: string;
  serviceName: string;
  professionalName: string;
  professionalAvatar?: string;
  startTime: string;
  duration: number;
  businessName: string;
  wasAutoAssigned: boolean;
  branchName?: string;
  branchAddress?: string;
}

const BookingConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const confirmationData = location.state as ConfirmationData;

  // Si no hay datos, redirigir a la página de reserva
  if (!confirmationData) {
    navigate(`/booking/${businessSlug}`);
    return null;
  }

  const formatDateTime = (dateTimeString: string) => {
    const [datePart, timePart] = dateTimeString.includes('T') 
      ? dateTimeString.split('T') 
      : [dateTimeString, '00:00:00'];
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    const date = new Date(year, month - 1, day, hours, minutes);
    
    // Formato completo y elegante para el recibo
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    return {
      date: date.toLocaleDateString('es-AR', dateOptions),
      time: date.toLocaleTimeString('es-AR', timeOptions)
    };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
    if (hours > 0) return `${hours}h`;
    return `${mins}min`;
  };

  const { date, time } = formatDateTime(confirmationData.startTime);

  const handleNewBooking = () => {
    navigate(`/booking/${businessSlug}`);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl w-full">
        {/* Card principal estilo recibo */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header con icono de éxito */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              ¡Reserva Confirmada!
            </h1>
            <p className="text-green-50 text-lg">
              Tu cita ha sido reservada exitosamente
            </p>
          </div>

          {/* Detalles de la reserva - Estilo recibo */}
          <div className="p-8">
            <div className="bg-gray-50 rounded-xl p-6 max-w-md mx-auto mb-8">
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                  <span className="text-gray-600">Cliente:</span>
                  <span className="font-semibold text-gray-900 text-right">{confirmationData.clientName}</span>
                </div>
                
                <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                  <span className="text-gray-600">Servicio:</span>
                  <span className="font-semibold text-gray-900 text-right">{confirmationData.serviceName}</span>
                </div>
                
                <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                  <span className="text-gray-600">Profesional:</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {confirmationData.professionalName}
                    {confirmationData.wasAutoAssigned && (
                      <span className="text-xs text-blue-600 ml-1 block">(asignado automáticamente)</span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                  <span className="text-gray-600">Fecha y hora:</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {date} - {time}
                  </span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Duración:</span>
                  <span className="font-semibold text-gray-900">{formatDuration(confirmationData.duration)}</span>
                </div>
                
                {(confirmationData.branchName || confirmationData.branchAddress) && (
                  <div className="flex justify-between items-start pt-3 border-t border-gray-200">
                    <span className="text-gray-600">Ubicación:</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {confirmationData.branchName}
                      {confirmationData.branchAddress && (
                        <span className="text-xs text-gray-500 block mt-1">{confirmationData.branchAddress}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                Te recomendamos guardar esta información para referencia futura.
                Si necesitas hacer cambios, contacta directamente con {confirmationData.businessName}.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleNewBooking}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Hacer otra reserva
                </button>
                <button
                  onClick={handleGoHome}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <Home className="w-5 h-5" />
                  <span>Volver al inicio</span>
                </button>
              </div>
              
              <div className="text-center pt-4">
                <p className="text-xs text-gray-500">
                  Número de reserva: <span className="font-mono font-semibold text-gray-700">{confirmationData.appointmentId.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;

