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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo size="md" />
        </div>

        {/* Card principal */}
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

          {/* Detalles de la reserva */}
          <div className="p-8">
            <div className="space-y-6">
              {/* Información del cliente */}
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Cliente</p>
                  <p className="text-lg font-semibold text-gray-900">{confirmationData.clientName}</p>
                </div>
              </div>

              {/* Servicio */}
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Servicio</p>
                  <p className="text-lg font-semibold text-gray-900">{confirmationData.serviceName}</p>
                </div>
              </div>

              {/* Profesional */}
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {confirmationData.professionalAvatar ? (
                    <img 
                      src={confirmationData.professionalAvatar} 
                      alt={confirmationData.professionalName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-indigo-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Profesional</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {confirmationData.professionalName}
                  </p>
                  {confirmationData.wasAutoAssigned && (
                    <p className="text-xs text-blue-600 mt-1">
                      (Asignado automáticamente)
                    </p>
                  )}
                </div>
              </div>

              {/* Fecha y hora */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Fecha</p>
                    <p className="text-base font-semibold text-gray-900 capitalize">{date}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Hora</p>
                    <p className="text-base font-semibold text-gray-900">{time}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Duración: {formatDuration(confirmationData.duration)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              {(confirmationData.branchName || confirmationData.branchAddress) && (
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Ubicación</p>
                    {confirmationData.branchName && (
                      <p className="text-base font-semibold text-gray-900">{confirmationData.branchName}</p>
                    )}
                    {confirmationData.branchAddress && (
                      <p className="text-sm text-gray-600 mt-1">{confirmationData.branchAddress}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-gray-700 mb-2">
                <strong>📧 Confirmación enviada:</strong> Revisa tu email para más detalles.
              </p>
              <p className="text-sm text-gray-700">
                <strong>📞 Cambios o consultas:</strong> Contacta con <strong>{confirmationData.businessName}</strong>.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleNewBooking}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                Hacer otra reserva
              </button>
              <button
                onClick={handleGoHome}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <Home className="w-5 h-5" />
                <span>Volver al inicio</span>
              </button>
            </div>

            {/* Número de reserva */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Número de reserva: <span className="font-mono font-semibold text-gray-700">{confirmationData.appointmentId.slice(0, 8).toUpperCase()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Gracias por confiar en nosotros</p>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;

