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
      const { user, business } = await authService.getProfile();
      setUser(user);
      setBusiness(business);
    } catch {
      setUser(null);
      setBusiness(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { user, business } = await authService.login({ email, password });
      setUser(user);
      setBusiness(business);
    } catch (error) {
      setUser(null);
      setBusiness(null);
      throw error;
    }
  };

  const register = async (data: RegisterForm) => {
    const result = await authService.register(data);

    if (!result || !result.user || !result.business) {
      throw new Error('Datos incompletos del registro');
    }

    const { user, business } = result;
    setUser(user);
    setBusiness(business);
    return result;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignorar errores de logout del servidor
    } finally {
      setUser(null);
      setBusiness(null);
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