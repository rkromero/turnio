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
    
    // Formato más corto para que quepa en pantalla
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-2 sm:p-4">
      <div className="max-w-4xl w-full">
        {/* Card principal */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header compacto con icono de éxito */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-6 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
              ¡Reserva Confirmada!
            </h1>
            <p className="text-green-50 text-sm sm:text-base">
              Tu cita ha sido reservada exitosamente
            </p>
          </div>

          {/* Detalles de la reserva - Grid compacto */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Información del cliente */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{confirmationData.clientName}</p>
                </div>
              </div>

              {/* Servicio */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Servicio</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{confirmationData.serviceName}</p>
                </div>
              </div>

              {/* Profesional */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {confirmationData.professionalAvatar ? (
                    <img 
                      src={confirmationData.professionalAvatar} 
                      alt={confirmationData.professionalName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Profesional</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {confirmationData.professionalName}
                    {confirmationData.wasAutoAssigned && <span className="text-xs text-blue-600 ml-1">(Auto)</span>}
                  </p>
                </div>
              </div>

              {/* Fecha */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Fecha</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize truncate">{date}</p>
                </div>
              </div>

              {/* Hora */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Hora</p>
                  <p className="text-sm font-semibold text-gray-900">{time}</p>
                  <p className="text-xs text-gray-500">({formatDuration(confirmationData.duration)})</p>
                </div>
              </div>

              {/* Ubicación */}
              {(confirmationData.branchName || confirmationData.branchAddress) && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg md:col-span-2">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Ubicación</p>
                    {confirmationData.branchName && (
                      <p className="text-sm font-semibold text-gray-900 truncate">{confirmationData.branchName}</p>
                    )}
                    {confirmationData.branchAddress && (
                      <p className="text-xs text-gray-600 truncate">{confirmationData.branchAddress}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Información adicional compacta */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-700 mb-1">
                <strong>📧</strong> Revisa tu email para más detalles.
              </p>
              <p className="text-xs text-gray-700">
                <strong>📞</strong> Consultas: <strong>{confirmationData.businessName}</strong>
              </p>
            </div>

            {/* Botones de acción compactos */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleNewBooking}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm hover:shadow"
              >
                Hacer otra reserva
              </button>
              <button
                onClick={handleGoHome}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Volver al inicio</span>
              </button>
            </div>

            {/* Número de reserva */}
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-500">
                ID: <span className="font-mono font-semibold text-gray-700">{confirmationData.appointmentId.slice(0, 8).toUpperCase()}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;

