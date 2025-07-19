import React from 'react';
import { CreditCard, MapPin, Star, AlertCircle, CheckCircle } from 'lucide-react';
import { PaymentOptions } from '../types/booking';

interface PaymentMethodSelectorProps {
  paymentOptions: PaymentOptions | null;
  message: string;
  selectedMethod: 'local' | 'online' | null;
  onMethodSelect: (method: 'local' | 'online') => void;
  servicePrice: number;
  isLoading?: boolean;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentOptions,
  message,
  selectedMethod,
  onMethodSelect,
  servicePrice,
  isLoading = false
}) => {
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getScoreColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentOptions) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Opciones de Pago</h3>
        </div>
        <p className="text-blue-800 mb-4">{message}</p>
        
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onMethodSelect('local')}
            className={`
              w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
              ${selectedMethod === 'local'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-3">
              <MapPin className={`w-5 h-5 ${selectedMethod === 'local' ? 'text-blue-600' : 'text-gray-600'}`} />
              <div className="flex-1">
                <h4 className={`font-medium ${selectedMethod === 'local' ? 'text-blue-900' : 'text-gray-900'}`}>
                  Pagar en el Local
                </h4>
                <p className="text-sm text-gray-600">
                  Paga en efectivo o tarjeta durante tu cita
                </p>
              </div>
              <span className={`font-bold ${selectedMethod === 'local' ? 'text-blue-600' : 'text-gray-600'}`}>
                {formatPrice(servicePrice)}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onMethodSelect('online')}
            className={`
              w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
              ${selectedMethod === 'online'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-3">
              <CreditCard className={`w-5 h-5 ${selectedMethod === 'online' ? 'text-blue-600' : 'text-gray-600'}`} />
              <div className="flex-1">
                <h4 className={`font-medium ${selectedMethod === 'online' ? 'text-blue-900' : 'text-gray-900'}`}>
                  Pagar Ahora Online
                </h4>
                <p className="text-sm text-gray-600">
                  Pago seguro con MercadoPago
                </p>
              </div>
              <span className={`font-bold ${selectedMethod === 'online' ? 'text-blue-600' : 'text-gray-600'}`}>
                {formatPrice(servicePrice)}
              </span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Cliente con scoring
  return (
    <div className={`
      rounded-lg p-6 border-2
      ${paymentOptions.requiresPayment 
        ? 'bg-orange-50 border-orange-200' 
        : 'bg-green-50 border-green-200'
      }
    `}>
      <div className="flex items-center space-x-2 mb-4">
        {paymentOptions.requiresPayment ? (
          <AlertCircle className="w-5 h-5 text-orange-600" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-600" />
        )}
        <h3 className={`font-semibold ${paymentOptions.requiresPayment ? 'text-orange-900' : 'text-green-900'}`}>
          Tu Historial de Reservas
        </h3>
      </div>

      {paymentOptions.scoring && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < paymentOptions.scoring!.starRating
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className={`font-bold ${getScoreColor(paymentOptions.scoring.starRating)}`}>
            {paymentOptions.scoring.starRating}★
          </span>
          <span className="text-sm text-gray-600">
            ({paymentOptions.scoring.totalBookings} citas, {paymentOptions.scoring.attendedCount} completadas)
          </span>
        </div>
      )}

      <p className={`mb-6 ${paymentOptions.requiresPayment ? 'text-orange-800' : 'text-green-800'}`}>
        {message}
      </p>

      <div className="space-y-3">
        {paymentOptions.canPayLater && (
          <button
            type="button"
            onClick={() => onMethodSelect('local')}
            className={`
              w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
              ${selectedMethod === 'local'
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-3">
              <MapPin className={`w-5 h-5 ${selectedMethod === 'local' ? 'text-green-600' : 'text-gray-600'}`} />
              <div className="flex-1">
                <h4 className={`font-medium ${selectedMethod === 'local' ? 'text-green-900' : 'text-gray-900'}`}>
                  Pagar en el Local
                </h4>
                <p className="text-sm text-gray-600">
                  Paga en efectivo o tarjeta durante tu cita
                </p>
              </div>
              <span className={`font-bold ${selectedMethod === 'local' ? 'text-green-600' : 'text-gray-600'}`}>
                {formatPrice(servicePrice)}
              </span>
            </div>
          </button>
        )}

        {paymentOptions.canPayOnline && (
          <button
            type="button"
            onClick={() => onMethodSelect('online')}
            className={`
              w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
              ${selectedMethod === 'online'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center space-x-3">
              <CreditCard className={`w-5 h-5 ${selectedMethod === 'online' ? 'text-blue-600' : 'text-gray-600'}`} />
              <div className="flex-1">
                <h4 className={`font-medium ${selectedMethod === 'online' ? 'text-blue-900' : 'text-gray-900'}`}>
                  Pagar Ahora Online
                </h4>
                <p className="text-sm text-gray-600">
                  Pago seguro con MercadoPago
                </p>
              </div>
              <span className={`font-bold ${selectedMethod === 'online' ? 'text-blue-600' : 'text-gray-600'}`}>
                {formatPrice(servicePrice)}
              </span>
            </div>
          </button>
        )}
      </div>

      {paymentOptions.requiresPayment && !paymentOptions.canPayLater && (
        <div className="mt-4 p-3 bg-orange-100 rounded-lg">
          <p className="text-sm text-orange-700">
            <strong>Importante:</strong> Debes pagar por adelantado para confirmar tu reserva debido a tu historial de reservas previas.
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector; 