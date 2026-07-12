import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../config/msal-config';
import { AuthUser, UserRole } from '../types';
import { apiClient } from '../services/api-client';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: () => Promise<void>;
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
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (isAuthenticated && accounts.length > 0 && inProgress === InteractionStatus.None) {
        try {
          // Get token silently
          const tokenResponse = await instance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0],
          });

          // Store ID token for API calls (not access token which is for Graph)
          localStorage.setItem('msalToken', tokenResponse.idToken);

          // Check if user has a tenant
          const token = tokenResponse.idToken;
          const tenantRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tenants/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const tenantData = await tenantRes.json();

          if (tenantData.success && tenantData.data) {
            // User has a tenant — load profile
            const tenantInfo = tenantData.data;
            setUser({
              _id: accounts[0].localAccountId,
              nombre: tenantInfo.user?.nombre || accounts[0].name || '',
              email: tenantInfo.user?.email || accounts[0].username || '',
              idTipoUsuario: 1,
              nombreTipoUsuario: tenantInfo.user?.role || 'Admin',
              activo: true,
            });
            // Store tenant config for palette etc.
            localStorage.setItem('tenantConfig', JSON.stringify(tenantInfo.tenant?.config || {}));
            localStorage.setItem('tenantNombre', tenantInfo.tenant?.nombre || '');
            localStorage.setItem('tenantPlan', tenantInfo.tenant?.plan || 'trial');
            localStorage.setItem('tenantPlanStatus', tenantInfo.tenant?.planStatus || 'trial');
            localStorage.setItem('tenantTrialEndsAt', tenantInfo.tenant?.trialEndsAt || '');

            // Apply palette
            if (tenantInfo.tenant?.config?.paleta) {
              const { getPalette, applyPalette } = await import('../config/palettes');
              applyPalette(getPalette(tenantInfo.tenant.config.paleta));
            }
          } else {
            // User has NO tenant — needs onboarding
            setUser({
              _id: accounts[0].localAccountId,
              nombre: accounts[0].name || accounts[0].username || '',
              email: accounts[0].username || '',
              idTipoUsuario: 0,
              nombreTipoUsuario: 'NeedOnboarding',
              activo: true,
            });
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUser({
            _id: accounts[0].localAccountId,
            nombre: accounts[0].name || accounts[0].username || '',
            email: accounts[0].username || '',
            idTipoUsuario: 1,
            nombreTipoUsuario: 'Admin',
            activo: true,
          });
        }
      } else if (!isAuthenticated && inProgress === InteractionStatus.None) {
        setUser(null);
        localStorage.removeItem('msalToken');
      }
      setLoading(false);
    };

    if (inProgress === InteractionStatus.None) {
      loadUserProfile();
    }
  }, [isAuthenticated, accounts, inProgress, instance]);

  const login = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('msalToken');
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    });
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
    loading: loading || inProgress !== InteractionStatus.None,
    login,
    logout,
    hasPermission,
    getDefaultRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
