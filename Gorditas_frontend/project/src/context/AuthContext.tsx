import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth as useOidc } from 'react-oidc-context';
import { apiService, type MotivoBloqueo } from '../services/api';
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
  /** Entró, pero todavía no confirma su correo: no puede operar. */
  correoPorVerificar: boolean;
  correoPendiente: string | null;
  /** La zona horaria del negocio; la usan las pantallas que necesitan saber qué día es hoy. */
  zonaHoraria: string | null;
  /** Por qué el plan no deja operar; `null` cuando deja. Lo decide el backend. */
  accesoBloqueado: MotivoBloqueo | null;
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
  /**
   * El mismo estado, legible despues de un `await`.
   *
   * `loadTenant` es dependencia del efecto que lo dispara, asi que no puede depender de
   * `tenantState` sin volver a crearse en cada cambio y reentrar. El espejo permite preguntar
   * «¿ya teniamos restaurante?» sin esa dependencia.
   */
  const estadoRef = useRef<TenantState>('idle');
  const fijarEstado = useCallback((s: TenantState) => {
    estadoRef.current = s;
    setTenantState(s);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [correoVerificado, setCorreoVerificado] = useState<boolean | null>(null);
  const [correoPendiente, setCorreoPendiente] = useState<string | null>(null);
  const [zonaHoraria, setZonaHoraria] = useState<string | null>(null);
  const [accesoBloqueado, setAccesoBloqueado] = useState<MotivoBloqueo | null>(null);
  const oidcRef = useRef(oidc);
  oidcRef.current = oidc;

  const accessToken = oidc.user?.access_token ?? null;

  // El cliente HTTP siempre lee el token vigente (la renovación silenciosa lo actualiza).
  useEffect(() => {
    apiService.setTokenProvider(() => oidcRef.current.user?.access_token ?? null);
    apiService.setOnUnauthorized(() => {
      void oidcRef.current.removeUser();
    });
    // Un plan puede vencer con la sesion abierta: el 403 de cualquier llamada lo dice, y a
    // partir de ahi la aplicacion deja de fingir que todo va bien.
    apiService.setOnPlanBloqueado((motivo) => setAccesoBloqueado(motivo));
    return () => {
      apiService.setOnUnauthorized(null);
      apiService.setOnPlanBloqueado(null);
    };
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
    // Anunciar `loading` hace que toda la aplicacion se cambie por la pantalla de carga: tanto
    // `BasicProtectedRoute` como `AuthenticatedApp` devuelven el spinner cuando esta puesto. Eso
    // esta bien mientras no sepamos de que restaurante se trata, y mal cuando ya lo sabemos y
    // solo lo estamos releyendo: el arbol entero se desmonta y se lleva por delante el estado de
    // la pantalla que pidio el refresco. Asi se perdia la confirmacion de Configuracion, que se
    // fijaba justo despues de esta llamada y moria antes de pintarse.
    const yaTeniamos = estadoRef.current === 'ready';
    if (!yaTeniamos) fijarEstado('loading');
    const res = await apiService.getTenantMe();
    if (res.success && res.data) {
      setTenant(res.data.tenant);
      setCorreoVerificado(res.data.user?.emailVerificado ?? true);
      setCorreoPendiente(res.data.user?.email ?? null);
      setZonaHoraria(res.data.zonaHoraria ?? null);
      setAccesoBloqueado(res.data.accesoBloqueado ?? null);
      setError(null);
      fijarEstado('ready');
      applyPalette(getPalette(res.data.tenant.config?.paleta || 'orange'));
      return;
    }
    if (res.status === 404 && res.code === 'NO_TENANT') {
      setTenant(null);
      fijarEstado('missing');
      return;
    }
    if (res.status === 401) {
      setTenant(null);
      fijarEstado('idle');
      return;
    }
    // Un tropiezo de red mientras se relee no es motivo para echar a nadie: el estado `error`
    // deja `user` en nulo y de ahi se sale a la pantalla de entrar. Si ya teniamos los datos,
    // se conservan y el operador sigue donde estaba.
    setError(res.error ?? 'No se pudo cargar el restaurante');
    if (!yaTeniamos) fijarEstado('error');
  }, [fijarEstado]);

  const sub = oidc.user?.profile.sub ?? null;
  useEffect(() => {
    if (oidc.isLoading) return;
    if (!sub || !accessToken) {
      setTenant(null);
      fijarEstado('idle');
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
    fijarEstado('idle');
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
    correoPorVerificar: authenticated && tenantState === 'ready' && correoVerificado === false,
    correoPendiente,
    zonaHoraria,
    accesoBloqueado,
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
