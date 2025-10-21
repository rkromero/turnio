import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Lazy loading para optimizar el bundle
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardRouter = lazy(() => import('./components/DashboardRouter'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentFailure = lazy(() => import('./pages/PaymentFailure'));
const PaymentPending = lazy(() => import('./pages/PaymentPending'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'));
const PlanSelection = lazy(() => import('./pages/PlanSelection'));

// Componente de loading optimizado
const LoadingSpinner = React.memo(() => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
));

// Componente para rutas protegidas - optimizado con memo
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
});

// Componente para rutas públicas - optimizado con memo
const PublicRoute: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
});

// Componente de página 404 optimizado
const NotFoundPage = React.memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900">404</h1>
      <p className="text-xl text-gray-600 mt-4">Página no encontrada</p>
      <a 
        href="/" 
        className="mt-6 inline-block btn-primary"
      >
        Volver al inicio
      </a>
    </div>
  </div>
));

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Landing Page - Página principal */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Rutas públicas */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />
        
        {/* Ruta para reservas públicas */}
        <Route path="/book/:businessSlug" element={<BookingPage />} />
        <Route path="/booking/:businessSlug/confirmation" element={<BookingConfirmationPage />} />
        
        {/* Rutas de pago (públicas) */}
        <Route path="/subscription/success" element={<PaymentSuccess />} />
        <Route path="/subscription/failure" element={<PaymentFailure />} />
        <Route path="/subscription/pending" element={<PaymentPending />} />
        
        {/* Callback de MercadoPago (protegido) */}
        <Route 
          path="/dashboard/settings/payments/callback" 
          element={
            <ProtectedRoute>
              <PaymentCallback />
            </ProtectedRoute>
          } 
        />
        
        {/* Ruta para selección de planes (protegida) */}
        <Route 
          path="/plans" 
          element={
            <ProtectedRoute>
              <PlanSelection />
            </ProtectedRoute>
          } 
        />
        
        {/* Rutas protegidas del dashboard */}
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          } 
        />
        
        {/* Página 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
