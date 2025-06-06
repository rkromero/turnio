import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Dashboard from '../pages/Dashboard';
import Services from '../pages/Services';

const DashboardRouter: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/services" element={<Services />} />
        
        {/* Rutas futuras */}
        <Route path="/appointments" element={
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Gestión de Turnos</h2>
            <p className="text-gray-600">Esta sección estará disponible pronto</p>
          </div>
        } />
        
        <Route path="/clients" element={
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Gestión de Clientes</h2>
            <p className="text-gray-600">Esta sección estará disponible pronto</p>
          </div>
        } />
        
        <Route path="/reports" element={
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📈</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Reportes y Estadísticas</h2>
            <p className="text-gray-600">Esta sección estará disponible pronto</p>
          </div>
        } />
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default DashboardRouter; 