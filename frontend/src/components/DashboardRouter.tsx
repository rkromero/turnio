import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import Dashboard from '../pages/Dashboard';
import Services from '../pages/Services';
import Appointments from '../pages/Appointments';
import Clients from '../pages/Clients';
import Reviews from '../pages/Reviews';
import Users from '../pages/Users';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import Branches from '../pages/Branches';
import Plans from '../pages/Plans';
import PlanChangeTest from '../pages/PlanChangeTest';

const DashboardRouter: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/services" element={<Services />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/users" element={<Users />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/plan-test" element={<PlanChangeTest />} />
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default DashboardRouter; 