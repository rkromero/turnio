import React, { useState, useEffect } from 'react';
import { reportService } from '../services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Download,
  Filter
} from 'lucide-react';

interface DashboardMetrics {
  period: number;
  revenue: number;
  totalAppointments: number;
  uniqueClients: number;
  appointmentsByStatus: Array<{
    status: string;
    count: number;
  }>;
  popularServices: Array<{
    serviceId: string;
    _count: { id: number };
    service: {
      id: string;
      name: string;
      price: number;
    };
  }>;
  dailyRevenue: Array<{
    date: string;
    amount: number;
  }>;
  hourlyStats: Array<{
    hour: string;
    count: number;
  }>;
}

const Reports: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Colores para los gráficos
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];
  const STATUS_COLORS = {
    CONFIRMED: '#8884d8',
    COMPLETED: '#82ca9d',
    CANCELLED: '#ff7300',
    NO_SHOW: '#ffc658'
  };

  useEffect(() => {
    // Configurar fechas por defecto
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    
    loadMetrics();
  }, [selectedPeriod]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await reportService.getDashboardMetrics(selectedPeriod);
      setMetrics(data);
    } catch (error) {
      console.error('Error cargando métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      CONFIRMED: 'Confirmadas',
      COMPLETED: 'Completadas',
      CANCELLED: 'Canceladas',
      NO_SHOW: 'No asistió'
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error cargando reportes</h2>
          <p className="text-gray-600">No se pudieron cargar los datos de reportes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reportes y Analytics</h1>
            <p className="text-gray-600 mt-2">
              Análisis detallado de tu negocio - Últimos {metrics.period} días
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Filter className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-700">Período:</span>
              
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
                <option value={90}>Últimos 90 días</option>
                <option value={365}>Último año</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">a</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}  
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.revenue)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Citas</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalAppointments}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Únicos</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.uniqueClients}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingreso Promedio</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(metrics.totalAppointments > 0 ? metrics.revenue / metrics.totalAppointments : 0)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Ingresos Diarios */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Ingresos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
              />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number), 'Ingreso']}
                labelFormatter={(label) => `Fecha: ${formatDate(label)}`}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: '#8884d8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Citas por Estado */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de las Citas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.appointmentsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, count, percent }) => 
                  `${getStatusLabel(status)}: ${count} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {metrics.appointmentsByStatus.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Servicios Populares */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Servicios Más Populares</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={metrics.popularServices.map(service => ({
                name: service.service.name,
                count: service._count.id,
                revenue: service._count.id * service.service.price
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'count' ? `${value} citas` : formatCurrency(value as number),
                  name === 'count' ? 'Cantidad' : 'Ingresos'
                ]}
              />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Cantidad de Citas" />
              <Bar dataKey="revenue" fill="#82ca9d" name="Ingresos Generados" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Horarios Más Demandados */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Horarios Más Demandados</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.hourlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} citas`, 'Cantidad']} />
              <Bar dataKey="count" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports; 