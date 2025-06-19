import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { useToast } from '../hooks/useToast';

interface PaymentData {
  status: string;
  subscription?: {
    id: string;
    planType: string;
  };
}

const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [retrying, setRetrying] = useState(false);
  
  const navigate = useNavigate();
  const { error, success } = useToast();

  const paymentId = searchParams.get('payment');
  const collectionId = searchParams.get('collection_id');
  const status = searchParams.get('status');

  useEffect(() => {
    if (paymentId) {
      checkPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);
      
      // Verificar el estado del pago en nuestro backend
      const response = await subscriptionService.checkPaymentStatus(paymentId!);
      
      if (response.success) {
        setPaymentData(response.data);
        
        if (response.data.status === 'APPROVED') {
          success('¡El pago fue procesado exitosamente!');
          navigate('/subscription/success?payment=' + paymentId);
          return;
        }
      }
    } catch (err) {
      console.error('Error verificando pago:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    try {
      setRetrying(true);
      
      // Crear un nuevo pago
      const paymentResponse = await subscriptionService.createPayment({
        subscriptionId: paymentData?.subscription?.id || ''
      });

      // Redirigir a MercadoPago
      const initPoint = process.env.NODE_ENV === 'production' 
        ? paymentResponse.data.initPoint 
        : paymentResponse.data.sandboxInitPoint;

      window.location.href = initPoint;

    } catch (err) {
      console.error('Error reintentando pago:', err);
      error('Error al reintentar el pago');
    } finally {
      setRetrying(false);
    }
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  const getErrorMessage = () => {
    if (status === 'rejected') {
      return 'Tu pago fue rechazado. Esto puede deberse a fondos insuficientes o problemas con tu método de pago.';
    } else if (status === 'cancelled') {
      return 'El pago fue cancelado. Puedes intentar nuevamente cuando estés listo.';
    } else if (status === 'pending') {
      return 'Tu pago está siendo procesado. Te notificaremos cuando se complete.';
    } else {
      return 'Hubo un problema procesando tu pago. Por favor, intenta nuevamente.';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
          <h2 className="text-xl font-semibold mb-2">Verificando pago...</h2>
          <p className="text-gray-600">Estamos revisando el estado de tu transacción</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Pago No Completado
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            {getErrorMessage()}
          </p>

          {/* Payment Details */}
          {paymentData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Detalles del intento:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium">{paymentData.subscription?.planType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-medium capitalize">{paymentData.status?.toLowerCase()}</span>
                </div>
                {collectionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID de transacción:</span>
                    <span className="font-medium text-xs">{collectionId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">¿Qué puedes hacer?</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Verificar que tu método de pago esté activo</li>
              <li>• Asegurarte de tener fondos suficientes</li>
              <li>• Intentar con otro método de pago</li>
              <li>• Contactar a tu banco si el problema persiste</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {retrying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar Nuevamente
                </>
              )}
            </button>

            <button
              onClick={handleGoBack}
              className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-gray-500 mt-4">
            Si el problema persiste, contacta nuestro soporte técnico.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure; 