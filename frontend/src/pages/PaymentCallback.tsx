import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

interface CallbackDetails {
  message?: string;
  error?: string;
  [key: string]: unknown;
}

const PaymentCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<CallbackDetails | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('🔍 Callback recibido:', { code, state, error });

        if (error) {
          setStatus('error');
          setMessage(`Error de autorización: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No se recibió el código de autorización');
          return;
        }

        // Enviar código al backend para intercambiar por tokens
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://turnio-backend-production.up.railway.app';
        
        // Obtener token de autenticación
        const token = localStorage.getItem('token') || 
                     document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/payments/mp/callback`, {
          method: 'POST',
          headers,
          credentials: 'include', // Incluir cookies
          body: JSON.stringify({
            code,
            state
          })
        });

        const data = await response.json();
        console.log('📥 Respuesta del backend:', data);

        if (response.ok && data.success) {
          setStatus('success');
          setMessage('¡MercadoPago conectado exitosamente!');
          setDetails(data);
          
          // Redirigir a configuración después de 3 segundos
          setTimeout(() => {
            navigate('/dashboard/settings?tab=payments');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Error procesando la autorización');
          setDetails(data);
        }

      } catch (error) {
        console.error('❌ Error en callback:', error);
        setStatus('error');
        setMessage('Error de conexión al procesar la autorización');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4">
            {status === 'loading' && (
              <Loader className="h-8 w-8 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-8 w-8 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'loading' && 'Procesando autorización...'}
            {status === 'success' && '¡Conexión exitosa!'}
            {status === 'error' && 'Error de autorización'}
          </h2>

          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {status === 'loading' && (
            <div className="text-sm text-gray-500">
              <p>Conectando tu cuenta de MercadoPago...</p>
              <p>Por favor espera un momento.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="text-sm text-green-800">
                <p className="font-medium mb-2">✅ Configuración completada:</p>
                <ul className="text-left space-y-1">
                  <li>• Cuenta de MercadoPago conectada</li>
                  <li>• Pagos habilitados para tu negocio</li>
                  <li>• Redirigiendo a configuración...</li>
                </ul>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="text-sm text-red-800">
                <p className="font-medium mb-2">❌ No se pudo completar la conexión:</p>
                <p>{message}</p>
                {details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Ver detalles técnicos</summary>
                    <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {status === 'success' && (
              <button
                onClick={() => navigate('/dashboard/settings?tab=payments')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Ir a Configuración de Pagos
              </button>
            )}

            {status === 'error' && (
              <button
                onClick={() => navigate('/dashboard/settings?tab=payments')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Volver a Intentar
              </button>
            )}

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Ir al Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback; 