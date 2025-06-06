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

export const UserStatsCard: React.FC<UserStatsCardProps> = ({ stats }) => {
  const { overview, topPerformers } = stats;

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    description?: string;
  }> = ({ title, value, icon, color, description }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Resumen General
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total de Usuarios"
            value={overview.totalUsers}
            icon={<Users className="w-6 h-6 text-blue-600" />}
            color="bg-blue-100 dark:bg-blue-900"
          />
          <StatCard
            title="Usuarios Activos"
            value={overview.activeUsers}
            icon={<UserCheck className="w-6 h-6 text-green-600" />}
            color="bg-green-100 dark:bg-green-900"
          />
          <StatCard
            title="Administradores"
            value={overview.adminUsers}
            icon={<Shield className="w-6 h-6 text-purple-600" />}
            color="bg-purple-100 dark:bg-purple-900"
          />
          <StatCard
            title="Empleados"
            value={overview.employeeUsers}
            icon={<Users className="w-6 h-6 text-indigo-600" />}
            color="bg-indigo-100 dark:bg-indigo-900"
          />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Usuarios Inactivos"
          value={overview.inactiveUsers}
          icon={<UserX className="w-6 h-6 text-red-600" />}
          color="bg-red-100 dark:bg-red-900"
          description={overview.inactiveUsers > 0 ? "Revisar y reactivar si es necesario" : "¡Excelente!"}
        />
        <StatCard
          title="Nuevos (30 días)"
          value={overview.recentUsers}
          icon={<UserPlus className="w-6 h-6 text-orange-600" />}
          color="bg-orange-100 dark:bg-orange-900"
          description="Usuarios agregados recientemente"
        />
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-500" />
            Top Performers
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="space-y-3">
                {topPerformers.map((performer, index) => (
                  <div 
                    key={performer.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' :
                        index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {performer.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {performer.role === 'ADMIN' ? 'Administrador' : 'Empleado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
          Resumen de Actividad
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overview.activeUsers > 0 ? Math.round((overview.activeUsers / overview.totalUsers) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tasa de Actividad</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {overview.activeUsers > 0 ? Math.round((overview.adminUsers / overview.activeUsers) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Administradores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {overview.totalUsers > 0 ? Math.round((overview.recentUsers / overview.totalUsers) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Crecimiento (30d)</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {(overview.inactiveUsers > 0 || overview.adminUsers === 0 || overview.employeeUsers === 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Recomendaciones
          </h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
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