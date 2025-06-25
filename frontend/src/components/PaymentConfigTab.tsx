import React, { useState, useEffect } from 'react';
import { CreditCard, Link2, Check, X, Settings, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PaymentSettings {
  require_payment: boolean;
  payment_deadline_hours: number;
  auto_cancel_unpaid: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  connected_at?: string;
  mp_user_id?: string;
}

const PaymentConfigTab: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [settings, setSettings] = useState<PaymentSettings>({
    require_payment: false,
    payment_deadline_hours: 24,
    auto_cancel_unpaid: false
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // Cargar estado de conexión y configuración en paralelo
      const [statusResponse, settingsResponse] = await Promise.all([
        fetch('/api/payments/mp/status', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch('/api/payments/settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setConnectionStatus(statusData.data);
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setSettings(settingsData.data);
      }

    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Error cargando configuración de pagos');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMercadoPago = async () => {
    try {
      setConnecting(true);
      
      const response = await fetch('/api/payments/mp/connect', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error obteniendo URL de conexión');
      }

      const data = await response.json();
      
      // Redirigir a MercadoPago para autorización
      window.location.href = data.data.auth_url;

    } catch (error) {
      console.error('Error connecting MercadoPago:', error);
      toast.error('Error conectando con MercadoPago');
      setConnecting(false);
    }
  };

  const handleDisconnectMercadoPago = async () => {
    if (!confirm('¿Estás seguro que deseas desconectar MercadoPago? Los pagos pendientes no se verán afectados.')) {
      return;
    }

    try {
      const response = await fetch('/api/payments/mp/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error desconectando MercadoPago');
      }

      setConnectionStatus({ connected: false });
      toast.success('MercadoPago desconectado exitosamente');

    } catch (error) {
      console.error('Error disconnecting MercadoPago:', error);
      toast.error('Error desconectando MercadoPago');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);

      const response = await fetch('/api/payments/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Error guardando configuración');
      }

      toast.success('Configuración guardada exitosamente');

    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error guardando configuración');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Configuración de Pagos</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configura los pagos online para tus citas con MercadoPago
        </p>
      </div>

      {/* Conexión con MercadoPago */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">MercadoPago</h4>
              <p className="text-sm text-gray-500">Procesar pagos online</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {connectionStatus?.connected ? (
              <>
                <div className="flex items-center space-x-2 text-green-600">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Conectado</span>
                </div>
                <button
                  onClick={handleDisconnectMercadoPago}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Desconectar
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectMercadoPago}
                disabled={connecting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Conectando...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Conectar MercadoPago
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {connectionStatus?.connected && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex">
              <Check className="w-5 h-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  Tu cuenta de MercadoPago está conectada correctamente.
                </p>
                {connectionStatus.connected_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Conectado el {new Date(connectionStatus.connected_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!connectionStatus?.connected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex">
              <X className="w-5 h-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Para recibir pagos online, necesitas conectar tu cuenta de MercadoPago.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Los pagos irán directamente a tu cuenta, no a TurnIO.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuración de Pagos */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Settings className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Configuración de Pagos</h4>
            <p className="text-sm text-gray-500">Define cómo funcionan los pagos en tu negocio</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Requerir Pago */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Requerir pago obligatorio
              </label>
              <p className="text-sm text-gray-500">
                Los clientes deben pagar al reservar la cita
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, require_payment: !prev.require_payment }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                settings.require_payment ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.require_payment ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tiempo límite para pagar */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Tiempo límite para pagar (horas)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={settings.payment_deadline_hours}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                payment_deadline_hours: parseInt(e.target.value) || 24 
              }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="text-sm text-gray-500 mt-1">
              Tiempo que tienen los clientes para completar el pago
            </p>
          </div>

          {/* Auto cancelar */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Cancelar automáticamente citas sin pagar
              </label>
              <p className="text-sm text-gray-500">
                Cancelar citas que no se paguen dentro del tiempo límite
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, auto_cancel_unpaid: !prev.auto_cancel_unpaid }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                settings.auto_cancel_unpaid ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.auto_cancel_unpaid ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {savingSettings ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </button>
        </div>
      </div>

      {/* Información Adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <DollarSign className="w-5 h-5 text-blue-400" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">¿Cómo funciona?</h4>
            <div className="text-sm text-blue-700 mt-1">
              <ul className="list-disc list-inside space-y-1">
                <li>Los clientes pueden pagar al reservar una cita</li>
                <li>Los pagos van directamente a tu cuenta de MercadoPago</li>
                <li>TurnIO no cobra comisiones adicionales por los pagos</li>
                <li>Recibes notificaciones cuando se completa un pago</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfigTab; 