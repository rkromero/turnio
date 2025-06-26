import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthContextType, User, Business, RegisterForm } from '../types';
import { authService } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Verificando estado de autenticación...');
      const { user, business } = await authService.getProfile();
      console.log('✅ Usuario autenticado:', user?.email);
      setUser(user);
      setBusiness(business);
    } catch (error) {
      console.log('❌ Usuario no autenticado:', error);
      // Usuario no autenticado
      setUser(null);
      setBusiness(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔍 Intentando login con:', email);
      const { user, business } = await authService.login({ email, password });
      console.log('✅ Login exitoso:', user?.email);
      setUser(user);
      setBusiness(business);
    } catch (error) {
      console.log('❌ Error en login:', error);
      // Asegurar que el estado se limpie en caso de error
      setUser(null);
      setBusiness(null);
      // Re-lanzar el error para que el componente Login lo maneje
      throw error;
    }
  };

  const register = async (data: RegisterForm) => {
    console.log('🔍 Iniciando registro en contexto...');
    const result = await authService.register(data);
    console.log('🔍 Resultado del authService.register:', result);
    
    if (!result || !result.user || !result.business) {
      console.error('❌ Datos incompletos del registro:', result);
      throw new Error('Datos incompletos del registro');
    }
    
    const { user, business } = result;
    console.log('🔍 Actualizando contexto con user:', user);
    console.log('🔍 Actualizando contexto con business:', business);
    
    setUser(user);
    setBusiness(business);
    
    console.log('✅ Contexto actualizado exitosamente');
    return result;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignorar errores de logout
    } finally {
      // Limpiar completamente el estado y tokens
      setUser(null);
      setBusiness(null);
      localStorage.removeItem('token');
      // Limpiar cookies
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  };

  const value: AuthContextType = {
    user,
    business,
    isLoading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 