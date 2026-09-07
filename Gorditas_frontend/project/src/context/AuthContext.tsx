import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth as useOidc } from 'react-oidc-context';
import { apiService } from '../services/api';
import { scopesForOrg } from '../config/auth-config';
import { getTenantSlug } from '../config/tenant-host';
import { applyPalette, getPalette } from '../config/palettes';
import { decodeJwtPayload, orgIdFromClaims, primaryRoleOf, rolesForOrg } from '../utils/claims';
import type { AuthUser, TenantInfo, UserRole } from '../types';
import { LoginError } from './login-error';

type TenantState = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

interface AuthContextType {
  user: AuthUser | null;
  tenant: TenantInfo | null;
  /** Sesión válida pero la organización no tiene restaurante registrado. */
  tenantMissing: boolean;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshTenant: () => Promise<void>;
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
  const oidc = useOidc();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [tenantState, setTenantState] = useState<TenantState>('idle');
  const [error, setError] = useState<string | null>(null);
  const oidcRef = useRef(oidc);
  oidcRef.current = oidc;

  const accessToken = oidc.user?.access_token ?? null;

  // El cliente HTTP siempre lee el token vigente (la renovación silenciosa lo actualiza).
  useEffect(() => {
    apiService.setTokenProvider(() => oidcRef.current.user?.access_token ?? null);
    apiService.setOnUnauthorized(() => {
      void oidcRef.current.removeUser();
    });
    return () => apiService.setOnUnauthorized(null);
  }, []);

  const user = useMemo<AuthUser | null>(() => {
    if (!oidc.user || !accessToken) return null;
    const claims = decodeJwtPayload(accessToken);
    const profile = (oidc.user.profile ?? {}) as Record<string, unknown>;
    const orgId = orgIdFromClaims(claims) ?? orgIdFromClaims(profile);
    const roles = rolesForOrg(claims, orgId).length > 0 ? rolesForOrg(claims, orgId) : rolesForOrg(profile, orgId);
    const primary = primaryRoleOf(roles);
    if (!primary) return null;
    return {
      _id: (claims.sub as string) || oidc.user.profile.sub,
      nombre: (profile.name as string) || (claims.name as string) || (profile.email as string) || '',
      email: (profile.email as string) || (claims.email as string) || '',
      idTipoUsuario: 1,
      nombreTipoUsuario: primary,
      roles,
      activo: true,
    };
  }, [oidc.user, accessToken]);

  const loadTenant = useCallback(async () => {
    setTenantState('loading');
    const res = await apiService.getTenantMe();
    if (res.success && res.data) {
      setTenant(res.data.tenant);
      setError(null);
      setTenantState('ready');
      applyPalette(getPalette(res.data.tenant.config?.paleta || 'orange'));
      return;
    }
    if (res.status === 404 && res.code === 'NO_TENANT') {
      setTenant(null);
      setTenantState('missing');
      return;
    }
    if (res.status === 401) {
      setTenant(null);
      setTenantState('idle');
      return;
    }
    setError(res.error ?? 'No se pudo cargar el restaurante');
    setTenantState('error');
  }, []);

  const sub = oidc.user?.profile.sub ?? null;
  useEffect(() => {
    if (oidc.isLoading) return;
    if (!sub || !accessToken) {
      setTenant(null);
      setTenantState('idle');
      return;
    }
    void loadTenant();
    // Solo recargar cuando cambia la identidad, no en cada renovación de token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub, oidc.isLoading, loadTenant]);

  const login = useCallback(async () => {
    const slug = getTenantSlug();
    // Host de la plataforma: no se sabe el restaurante todavía. Se pide un acceso general y Zitadel
    // identifica a la persona por su correo; después se le lleva a su restaurante (ver Callback).
    if (!slug) {
      await oidc.signinRedirect();
      return;
    }
    const res = await apiService.getTenantBySlug(slug);
    if (!res.success || !res.data?.orgId) {
      throw new LoginError(res.status === 0 ? 'NETWORK' : 'TENANT_NOT_FOUND', res.error ?? 'Restaurante no encontrado');
    }
    await oidc.signinRedirect({ scope: scopesForOrg(res.data.orgId), state: { slug } });
  }, [oidc]);

  const logout = useCallback(async () => {
    setTenant(null);
    setTenantState('idle');
    try {
      await oidc.signoutRedirect();
    } catch {
      await oidc.removeUser();
    }
  }, [oidc]);

  const hasPermission = useCallback(
    (roles: UserRole[]): boolean => {
      if (!user) return false;
      return user.roles.some((r) => roles.includes(r));
    },
    [user],
  );

  const getDefaultRoute = useCallback((): string => {
    if (!user) return '/login';
    switch (user.nombreTipoUsuario) {
      case 'Despachador':
      case 'Cocinero':
        return '/surtir-orden';
      case 'Mesero':
        return '/nueva-orden';
      case 'Admin':
      case 'Encargado':
      default:
        return '/';
    }
  }, [user]);

  const authenticated = Boolean(oidc.isAuthenticated && accessToken);
  const loading = oidc.isLoading || (authenticated && (tenantState === 'idle' || tenantState === 'loading'));

  const value: AuthContextType = {
    user: authenticated && tenantState === 'ready' ? user : null,
    tenant: tenantState === 'ready' ? tenant : null,
    tenantMissing: authenticated && (tenantState === 'missing' || (tenantState === 'ready' && user === null)),
    loading,
    error: oidc.error?.message ?? error,
    isAuthenticated: authenticated,
    login,
    logout,
    refreshTenant: loadTenant,
    hasPermission,
    getDefaultRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
