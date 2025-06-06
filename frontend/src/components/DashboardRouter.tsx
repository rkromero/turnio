import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Dashboard from '../pages/Dashboard';
import Services from '../pages/Services';
import Appointments from '../pages/Appointments';
import Clients from '../pages/Clients';
import Users from '../pages/Users';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';

const DashboardRouter: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/services" element={<Services />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/users" element={<Users />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default DashboardRouter; 