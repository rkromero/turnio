import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { useToast } from '../hooks/useToast';

interface PaymentData {
  status: string;
  amount: number;
  subscription?: {
    planType: string;
    billingCycle: string;
  };
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [verifying, setVerifying] = useState(false);
  
  const navigate = useNavigate();
  const { success, error } = useToast();

  const paymentId = searchParams.get('payment');
  const collectionId = searchParams.get('collection_id');

  useEffect(() => {
    if (paymentId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  const verifyPayment = async () => {
    try {
      setVerifying(true);
      
      // Verificar el estado del pago en nuestro backend
      const response = await subscriptionService.checkPaymentStatus(paymentId!);
      
      if (response.success && response.data.status === 'APPROVED') {
        setPaymentData(response.data);
        success('¡Pago procesado exitosamente!');
      } else {
        error('Error verificando el pago');
      }
    } catch (error) {
      console.error('Error verificando pago:', error);
      error('Error verificando el pago');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
          <h2 className="text-xl font-semibold mb-2">Verificando pago...</h2>
          <p className="text-gray-600">Estamos confirmando tu transacción</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ¡Pago Exitoso!
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Tu pago ha sido procesado correctamente. Tu plan ha sido activado y ya puedes disfrutar de todas las funcionalidades.
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
                  <span className="text-gray-600">Ciclo de facturación:</span>
                  <span className="font-medium">
                    {paymentData.subscription?.billingCycle === 'MONTHLY' ? 'Mensual' : 'Anual'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto:</span>
                  <span className="font-medium">
                    ${paymentData.amount?.toLocaleString('es-AR')}
                  </span>
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

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Próximos pasos:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Tu plan ya está activo</li>
              <li>• Recibirás un email de confirmación</li>
              <li>• Puedes empezar a usar todas las funcionalidades</li>
            </ul>
          </div>

          {/* Action Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
          >
            Ir al Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>

          {/* Additional Info */}
          <p className="text-xs text-gray-500 mt-4">
            Si tienes alguna pregunta, no dudes en contactarnos.
          </p>
        </div>

        {/* Verification Status */}
        {verifying && (
          <div className="mt-4 text-center">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            <span className="text-sm text-gray-600">Verificando estado del pago...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess; 