import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, UserRole } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (roles: UserRole[]) => boolean;
  getDefaultRoute: () => string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = authService.getToken();
      if (token) {
        try {
          const response = await authService.getProfile();
          if (response.success && response.data) {
            setUser(response.data as AuthUser);
          } else {
            authService.logout();
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          authService.logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login(email, password);
      if (response.success && response.data && response.data.token && response.data.user) {
        authService.setToken(response.data.token);
        setUser(response.data.user as unknown as AuthUser);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const hasPermission = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.nombreTipoUsuario as UserRole);
  };

  const getDefaultRoute = (): string => {
    if (!user) return '/login';

    switch (user.nombreTipoUsuario) {
      case 'Despachador':
        return '/surtir-orden';
      case 'Mesero':
        return '/nueva-orden';
      case 'Admin':
      case 'Encargado':
      default:
        return '/';
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    getDefaultRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
