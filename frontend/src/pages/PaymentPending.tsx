import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { useToast } from '../hooks/useToast';

interface PaymentData {
  status: string;
  subscription?: {
    planType: string;
  };
}

const PaymentPending: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [checking, setChecking] = useState(false);
  
  const navigate = useNavigate();
  const { success, error } = useToast();

  const paymentId = searchParams.get('payment');
  const collectionId = searchParams.get('collection_id');

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

  const handleRefresh = async () => {
    try {
      setChecking(true);
      await checkPaymentStatus();
    } catch (err) {
      console.error('Error refrescando estado:', err);
      error('Error al verificar el estado del pago');
    } finally {
      setChecking(false);
    }
  };

  const handleGoBack = () => {
    navigate('/dashboard');
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
          {/* Pending Icon */}
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Pago en Proceso
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Tu pago está siendo procesado. Esto puede tomar unos minutos. 
            Te notificaremos por email cuando se complete.
          </p>

          {/* Payment Details */}
          {paymentData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Detalles del pago:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium">{paymentData.subscription?.planType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-medium text-yellow-600">En proceso</span>
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

          {/* Info Section */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">¿Qué está pasando?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Tu pago está siendo verificado</li>
              <li>• Esto puede tomar entre 5-30 minutos</li>
              <li>• Recibirás un email de confirmación</li>
              <li>• Tu plan se activará automáticamente</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              disabled={checking}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verificar Estado
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
            Puedes continuar usando tu plan actual mientras se procesa el pago.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPending; 