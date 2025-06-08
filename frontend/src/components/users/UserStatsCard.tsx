import React from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  UserPlus, 
  Calendar,
  TrendingUp,
  Award
} from 'lucide-react';
import { UserStats } from '../../types';

interface UserStatsCardProps {
  stats: UserStats;
}

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  description?: string;
}> = ({ title, value, icon, color, description }) => (
  <div className="stats-card">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-600">{title}</h4>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
    {description && (
      <p className="text-xs text-gray-500 mt-2">{description}</p>
    )}
  </div>
);

export const UserStatsCard: React.FC<UserStatsCardProps> = ({ stats }) => {
  const { overview, topPerformers } = stats;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resumen General
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total de Usuarios"
            value={overview.totalUsers}
            icon={<Users className="w-6 h-6 text-blue-600" />}
            color="bg-blue-100"
          />
          <StatCard
            title="Usuarios Activos"
            value={overview.activeUsers}
            icon={<UserCheck className="w-6 h-6 text-green-600" />}
            color="bg-green-100"
          />
          <StatCard
            title="Administradores"
            value={overview.adminUsers}
            icon={<Shield className="w-6 h-6 text-purple-600" />}
            color="bg-purple-100"
          />
          <StatCard
            title="Empleados"
            value={overview.employeeUsers}
            icon={<Users className="w-6 h-6 text-indigo-600" />}
            color="bg-indigo-100"
          />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Usuarios Inactivos"
          value={overview.inactiveUsers}
          icon={<UserX className="w-6 h-6 text-red-600" />}
          color="bg-red-100"
          description={overview.inactiveUsers > 0 ? "Revisar y reactivar si es necesario" : "¡Excelente!"}
        />
        <StatCard
          title="Nuevos (30 días)"
          value={overview.recentUsers}
          icon={<UserPlus className="w-6 h-6 text-orange-600" />}
          color="bg-orange-100"
          description="Usuarios agregados recientemente"
        />
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-500" />
            Top Performers
          </h3>
          <div className="card">
            <div className="card-body">
              <div className="space-y-3">
                {topPerformers.map((performer, index) => (
                  <div 
                    key={performer.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {performer.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {performer.role === 'ADMIN' ? 'Administrador' : 'Empleado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {performer._count.appointments} citas
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Summary */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
            Resumen de Actividad
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {overview.activeUsers > 0 ? Math.round((overview.activeUsers / overview.totalUsers) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Tasa de Actividad</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {overview.activeUsers > 0 ? Math.round((overview.adminUsers / overview.activeUsers) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Administradores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {overview.totalUsers > 0 ? Math.round((overview.recentUsers / overview.totalUsers) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Crecimiento (30d)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {(overview.inactiveUsers > 0 || overview.adminUsers === 0 || overview.employeeUsers === 0) && (
        <div className="warning-card">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            Recomendaciones
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {overview.inactiveUsers > 0 && (
              <li>• Revisar y reactivar {overview.inactiveUsers} usuario(s) inactivo(s)</li>
            )}
            {overview.adminUsers === 0 && (
              <li>• Asignar al menos un administrador para gestión completa</li>
            )}
            {overview.employeeUsers === 0 && overview.totalUsers > 1 && (
              <li>• Considerar agregar empleados para distribuir la carga de trabajo</li>
            )}
            {overview.totalUsers === 1 && (
              <li>• Agregar más usuarios para aprovechar las funcionalidades colaborativas</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}; 