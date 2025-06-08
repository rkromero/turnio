import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Building2, Clock, Calendar, CreditCard } from 'lucide-react';
import { configService } from '../services/api';
import BusinessConfigTab from '../components/settings/BusinessConfigTab';
import WorkingHoursTab from '../components/settings/WorkingHoursTab';
import HolidaysTab from '../components/settings/HolidaysTab';
import PlanUsageTab from '../components/settings/PlanUsageTab';
import type { BusinessConfig, UserWithWorkingHours, Holiday, PlanUsage } from '../types';

type TabType = 'business' | 'working-hours' | 'holidays' | 'plan';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('business');
  const [loading, setLoading] = useState(true);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);
  const [workingHours, setWorkingHours] = useState<UserWithWorkingHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);

  const tabs = [
    {
      key: 'business' as TabType,
      label: 'Negocio',
      icon: Building2,
      description: 'Información básica del negocio'
    },
    {
      key: 'working-hours' as TabType,
      label: 'Horarios',
      icon: Clock,
      description: 'Horarios de trabajo del personal'
    },
    {
      key: 'holidays' as TabType,
      label: 'Feriados',
      icon: Calendar,
      description: 'Días no laborables y feriados'
    },
    {
      key: 'plan' as TabType,
      label: 'Plan',
      icon: CreditCard,
      description: 'Información del plan y uso'
    }
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [businessData, workingHoursData, holidaysData, planData] = await Promise.all([
        configService.getBusinessConfig(),
        configService.getWorkingHours(),
        configService.getHolidays(),
        configService.getPlanUsage()
      ]);

      setBusinessConfig(businessData);
      setWorkingHours(workingHoursData);
      setHolidays(holidaysData);
      setPlanUsage(planData);

    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBusinessConfigUpdate = (updatedConfig: BusinessConfig) => {
    setBusinessConfig(updatedConfig);
  };

  const handleWorkingHoursUpdate = (updatedUsers: UserWithWorkingHours[]) => {
    setWorkingHours(updatedUsers);
  };

  const handleHolidaysUpdate = (updatedHolidays: Holiday[]) => {
    setHolidays(updatedHolidays);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'business':
        return (
          <BusinessConfigTab
            businessConfig={businessConfig}
            onUpdate={handleBusinessConfigUpdate}
          />
        );
      case 'working-hours':
        return (
          <WorkingHoursTab
            users={workingHours}
            onUpdate={handleWorkingHoursUpdate}
          />
        );
      case 'holidays':
        return (
          <HolidaysTab
            holidays={holidays}
            onUpdate={handleHolidaysUpdate}
          />
        );
      case 'plan':
        return (
          <PlanUsageTab
            planUsage={planUsage}
            onPlanChanged={loadData}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuraciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <SettingsIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>
              <p className="text-sm text-gray-600">
                Gestiona la configuración de tu negocio y preferencias
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar con tabs */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Secciones</h2>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-start space-x-3 px-3 py-3 rounded-md text-left transition-colors ${
                        activeTab === tab.key
                          ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        activeTab === tab.key ? 'text-primary-600' : 'text-gray-500'
                      }`} />
                      <div>
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-sm text-gray-500">{tab.description}</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Plan info card */}
            {planUsage && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <CreditCard className="h-5 w-5 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">Plan Actual</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Plan:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      planUsage.planType === 'FREE' ? 'bg-gray-100 text-gray-800' :
                      planUsage.planType === 'BASIC' ? 'bg-blue-100 text-blue-800' :
                      planUsage.planType === 'PREMIUM' ? 'bg-purple-100 text-purple-800' :
                      'bg-gold-100 text-gold-800'
                    }`}>
                      {planUsage.planType}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Citas este mes:</span>
                    <span className="text-sm font-medium">
                      {planUsage.usage.appointments.current}/{planUsage.usage.appointments.limit === -1 ? '∞' : planUsage.usage.appointments.limit}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contenido principal */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 