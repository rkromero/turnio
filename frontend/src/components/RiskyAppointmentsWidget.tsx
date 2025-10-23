import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronRight, Calendar, User, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

// Widget de Predicción de Riesgo - Actualizado

interface RiskyAppointment {
  id: string;
  startTime: string;
  client: {
    name: string;
    email?: string;
    phone?: string;
  };
  service: {
    name: string;
  };
  user?: {
    name: string;
  };
  riskPrediction: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    riskScore: number;
    clientRisk: number;
    timeSlotRisk: number;
    serviceRisk: number;
  };
}

const RiskyAppointmentsWidget: React.FC = () => {
  const [riskyAppointments, setRiskyAppointments] = useState<RiskyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ high: 0, medium: 0, total: 0 });
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    loadRiskyAppointments();
  }, []);

  const loadRiskyAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://turnio-backend-production.up.railway.app/api/risk-predictions/risky?level=ALL&limit=10', {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setRiskyAppointments(data.data || []);
        setStats(data.stats || { high: 0, medium: 0, total: 0 });
      }
    } catch (error) {
      console.error('Error cargando citas de riesgo:', error);
      toast.error('Error al cargar predicciones de riesgo');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = date.toLocaleDateString('es-AR');
    const timeOnly = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === today.toDateString()) {
      return `Hoy ${timeOnly}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Mañana ${timeOnly}`;
    } else {
      return `${dateOnly} ${timeOnly}`;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'HIGH': return 'Alto';
      case 'MEDIUM': return 'Medio';
      default: return 'Bajo';
    }
  };

  const getRiskPercentage = (score: number) => {
    return Math.round(score * 100);
  };

  const sendHighRiskReminders = async () => {
    try {
      setSendingReminders(true);
      const response = await fetch('https://turnio-backend-production.up.railway.app/api/risk-predictions/send-high-risk-reminders', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`✅ ${data.data.sent} recordatorios enviados exitosamente`);
      } else {
        toast.error(data.message || 'Error al enviar recordatorios');
      }
    } catch (error) {
      console.error('Error enviando recordatorios:', error);
      toast.error('Error al enviar recordatorios de alto riesgo');
    } finally {
      setSendingReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // No mostrar el widget si no hay citas con riesgo
  if (riskyAppointments.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b border-red-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Turnos en Riesgo
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Predicción de cancelaciones mediante IA
              </p>
            </div>
          </div>
          
          {/* Botón para enviar recordatorios */}
          {stats.high > 0 && (
            <button
              onClick={sendHighRiskReminders}
              disabled={sendingReminders}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {sendingReminders ? (
                <>
                  <div className="loading-spinner-mobile w-4 h-4"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Enviar Recordatorios</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white rounded-lg p-3 border border-red-200">
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
            <div className="text-xs text-gray-600">Alto riesgo</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
            <div className="text-xs text-gray-600">Riesgo medio</div>
          </div>
        </div>
      </div>

      {/* Lista de citas en riesgo */}
      <div className="p-6">
        <div className="space-y-3">
          {riskyAppointments.slice(0, 5).map((appointment) => (
            <div
              key={appointment.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${getRiskColor(appointment.riskPrediction.riskLevel)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-bold">
                    Riesgo {getRiskLabel(appointment.riskPrediction.riskLevel)} ({getRiskPercentage(appointment.riskPrediction.riskScore)}%)
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2 text-gray-700">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{formatDate(appointment.startTime)}</span>
                </div>

                <div className="flex items-center space-x-2 text-gray-700">
                  <User className="w-4 h-4" />
                  <span>{appointment.client.name}</span>
                </div>

                <div className="text-gray-600">
                  {appointment.service.name}
                  {appointment.user && ` • ${appointment.user.name}`}
                </div>
              </div>

              {/* Factores de riesgo */}
              <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="font-medium">{getRiskPercentage(appointment.riskPrediction.clientRisk)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horario:</span>
                    <span className="font-medium">{getRiskPercentage(appointment.riskPrediction.timeSlotRisk)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Servicio:</span>
                    <span className="font-medium">{getRiskPercentage(appointment.riskPrediction.serviceRisk)}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {riskyAppointments.length > 5 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center mx-auto space-x-1">
              <span>Ver {riskyAppointments.length - 5} turnos más en riesgo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sugerencias */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Acciones sugeridas</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Enviar recordatorio extra a clientes de alto riesgo</li>
            <li>• Confirmar asistencia por WhatsApp o teléfono</li>
            <li>• Considerar sobreagendar estos horarios</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RiskyAppointmentsWidget;

