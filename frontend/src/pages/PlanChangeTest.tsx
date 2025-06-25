import React, { useState, useEffect } from 'react';
import { Loader2, ArrowUp, ArrowDown, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { useToast } from '../hooks/useToast';

interface Subscription {
  id: string;
  planType: string;
  status: string;
  nextBillingDate: string;
  metadata?: any;
}

interface PlanChange {
  id: string;
  fromPlan: string;
  toPlan: string;
  changeReason: string;
  createdAt: string;
}

const PlanChangeTest: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [planHistory, setPlanHistory] = useState<PlanChange[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [businessId, setBusinessId] = useState<string>('');

  const { success, error } = useToast();

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getCurrentSubscription();
      console.log('📊 Suscripción actual:', response);
      console.log('📊 Response.data:', response.data);
      console.log('📊 Response.data.subscription:', response.data?.subscription);
      console.log('📊 Response.data.business:', response.data?.business);
      
      if (response.data && response.data.subscription) {
        setSubscription(response.data.subscription);
        setBusinessId(response.data.business?.id || '');
        console.log('✅ Subscription cargada correctamente:', response.data.subscription);
      } else {
        console.log('❌ No se encontró subscription en la respuesta');
        console.log('❌ Estructura completa de response.data:', JSON.stringify(response.data, null, 2));
      }
      
      // Cargar historial de cambios
      if (response.data?.business?.id) {
        await loadPlanHistory(response.data.business.id);
      }
    } catch (err) {
      console.error('Error cargando suscripción:', err);
      error('Error cargando suscripción');
    } finally {
      setLoading(false);
    }
  };

  const loadPlanHistory = async (businessId: string) => {
    try {
      const response = await subscriptionService.getPlanChangeHistory(businessId);
      setPlanHistory(response.data?.history || []);
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  };

  const handleChangePlan = async () => {
    console.log('🔍 Debug - handleChangePlan llamado');
    console.log('🔍 Debug - subscription:', subscription);
    console.log('🔍 Debug - selectedPlan:', selectedPlan);
    
    if (!subscription || !selectedPlan) {
      console.log('❌ Debug - Validación falló: subscription o selectedPlan vacío');
      error('Selecciona un plan para cambiar');
      return;
    }

    if (selectedPlan === subscription.planType) {
      console.log('❌ Debug - Mismo plan seleccionado');
      error('Ya tienes este plan activo');
      return;
    }

    try {
      setChanging(true);
      console.log(`🔄 Cambiando plan: ${subscription.planType} → ${selectedPlan}`);
      console.log(`🔄 Subscription ID: ${subscription.id}`);
      
      const result = await subscriptionService.changePlan(subscription.id, selectedPlan);
      console.log('✅ Resultado del cambio:', result);
      
      success(result.message || 'Plan cambiado exitosamente');
      
      // Recargar suscripción
      await loadSubscription();
      
    } catch (err: any) {
      console.error('❌ Error cambiando plan:', err);
      console.error('❌ Error response:', err.response?.data);
      error(err.response?.data?.message || 'Error cambiando plan');
    } finally {
      setChanging(false);
    }
  };

  const handleProcessUpgradePayment = async (paymentId: string) => {
    try {
      console.log(`💳 Procesando pago de upgrade: ${paymentId}`);
      const result = await subscriptionService.processUpgradePayment(paymentId);
      success(result.message || 'Pago de upgrade procesado');
      await loadSubscription();
    } catch (err: any) {
      console.error('Error procesando pago de upgrade:', err);
      error(err.response?.data?.message || 'Error procesando pago');
    }
  };

  const handleProcessDowngradePayment = async (paymentId: string) => {
    try {
      console.log(`💳 Procesando pago de downgrade: ${paymentId}`);
      const result = await subscriptionService.processDowngradePayment(paymentId);
      success(result.message || 'Pago de downgrade procesado');
      await loadSubscription();
    } catch (err: any) {
      console.error('Error procesando pago de downgrade:', err);
      error(err.response?.data?.message || 'Error procesando pago');
    }
  };

  const handleProcessPendingDowngrades = async () => {
    try {
      console.log('🔍 Procesando downgrades pendientes...');
      const result = await subscriptionService.processPendingDowngrades();
      success(`Procesados ${result.data?.processedCount || 0} downgrades pendientes`);
      await loadSubscription();
    } catch (err: any) {
      console.error('Error procesando downgrades:', err);
      error(err.response?.data?.message || 'Error procesando downgrades');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'PENDING_UPGRADE':
      case 'PENDING_DOWNGRADE_PAYMENT':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Activo';
      case 'PENDING_UPGRADE':
        return 'Pendiente de Pago (Upgrade)';
      case 'PENDING_DOWNGRADE_PAYMENT':
        return 'Pendiente de Pago (Downgrade)';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Prueba de Cambio de Plan</h1>
        <p className="text-gray-600">
          Prueba el sistema completo de cambio de plan, upgrade y downgrade
        </p>
      </div>

      {/* Estado Actual */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Estado Actual</h2>
        
        {subscription && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Plan Actual</p>
                <p className="text-lg font-semibold">{subscription.planType}</p>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(subscription.status)}
                <span className="text-sm font-medium">{getStatusText(subscription.status)}</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Próximo Cobro</p>
              <p className="text-lg font-semibold">
                {new Date(subscription.nextBillingDate).toLocaleDateString()}
              </p>
            </div>

            {subscription.metadata && (
              <div>
                <p className="text-sm text-gray-600">Metadata</p>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(subscription.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cambio de Plan */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Cambiar Plan</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuevo Plan
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Selecciona un plan</option>
              <option value="FREE">FREE</option>
              <option value="BASIC">BASIC</option>
              <option value="PREMIUM">PREMIUM</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </div>

          <button
            onClick={() => {
              console.log('🔍 Debug - Botón Cambiar Plan clickeado');
              handleChangePlan();
            }}
            disabled={!selectedPlan || changing}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {changing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowUp className="w-4 h-4 mr-2" />
            )}
            Cambiar Plan
          </button>
        </div>
      </div>

      {/* Acciones de Prueba */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones de Prueba</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleProcessPendingDowngrades}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center"
          >
            <Clock className="w-4 h-4 mr-2" />
            Procesar Downgrades Pendientes
          </button>
        </div>
      </div>

      {/* Historial de Cambios */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Historial de Cambios</h2>
        
        {planHistory.length > 0 ? (
          <div className="space-y-3">
            {planHistory.map((change) => (
              <div key={change.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    {change.changeReason === 'upgrade' ? (
                      <ArrowUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="font-medium">
                      {change.fromPlan} → {change.toPlan}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {change.changeReason} - {new Date(change.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No hay cambios de plan registrados</p>
        )}
      </div>
    </div>
  );
};

export default PlanChangeTest; 