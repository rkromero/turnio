import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Building2, Clock, Calendar, CreditCard, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    {
      key: 'business' as TabType,
      label: 'Negocio',
      icon: Building2,
      description: 'Información básica del negocio',
      color: 'text-blue-600'
    },
    {
      key: 'working-hours' as TabType,
      label: 'Horarios',
      icon: Clock,
      description: 'Horarios de trabajo del personal',
      color: 'text-green-600'
    },
    {
      key: 'holidays' as TabType,
      label: 'Feriados',
      icon: Calendar,
      description: 'Días no laborables y feriados',
      color: 'text-orange-600'
    },
    {
      key: 'plan' as TabType,
      label: 'Plan',
      icon: CreditCard,
      description: 'Información del plan y uso',
      color: 'text-purple-600'
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

  const handleTabChange = (tabKey: TabType) => {
    setActiveTab(tabKey);
    setIsMobileMenuOpen(false);
  };

  const currentTab = tabs.find(tab => tab.key === activeTab);

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
      <div className="min-h-screen bg-gray-50">
        <div className="section-container section-padding">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando configuraciones...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="page-header">
        <div className="section-container">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <SettingsIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Gestiona la configuración de tu negocio y preferencias
                  </p>
                </div>
              </div>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden btn-ghost p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
            
            {/* Mobile tab indicator */}
            {currentTab && (
              <div className="lg:hidden mt-4 p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-2">
                  <currentTab.icon className={`h-5 w-5 ${currentTab.color}`} />
                  <div>
                    <div className="font-medium text-gray-900">{currentTab.label}</div>
                    <div className="text-sm text-gray-600">{currentTab.description}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sidebar-nav">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Secciones</h2>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={`nav-item w-full ${
                        activeTab === tab.key ? 'active' : ''
                      }`}
                    >
                      <Icon className={`h-5 w-5 flex-shrink-0 ${
                        activeTab === tab.key ? 'text-purple-600' : tab.color
                      }`} />
                      <div className="text-left">
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
              <div className="mt-6 card">
                <div className="card-body">
                  <div className="flex items-center space-x-2 mb-4">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Plan Actual</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Plan:</span>
                      <span className={`badge badge-${
                        planUsage.planType === 'FREE' ? 'gray' :
                        planUsage.planType === 'BASIC' ? 'primary' :
                        planUsage.planType === 'PREMIUM' ? 'primary' :
                        'primary'
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
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${Math.min(planUsage.usage.appointments.percentage, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Navigation Overlay */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Secciones</h2>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="btn-ghost p-1"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <nav className="p-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className={`nav-item w-full ${
                          activeTab === tab.key ? 'active' : ''
                        }`}
                      >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${
                          activeTab === tab.key ? 'text-purple-600' : tab.color
                        }`} />
                        <div className="text-left">
                          <div className="font-medium">{tab.label}</div>
                          <div className="text-sm text-gray-500">{tab.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="card">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 