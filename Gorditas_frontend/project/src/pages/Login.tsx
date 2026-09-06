import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChefHat, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoginError } from '../context/login-error';
import { apiService } from '../services/api';
import { appConfig, assetUrl } from '../config/app-config';
import { appUrl, getTenantSlug, isLocalHost, isValidSlug, setDevTenantSlug, tenantHostLabel } from '../config/tenant-host';
import type { TenantPublicInfo } from '../types';

const Login: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated, tenantMissing, login, getDefaultRoute } = useAuth();
  const [slug, setSlug] = useState<string | null>(() => getTenantSlug());
  const [tenant, setTenant] = useState<TenantPublicInfo | null>(null);
  const [tenantError, setTenantError] = useState('');
  const [devSlug, setDevSlug] = useState(slug ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) {
      setTenant(null);
      return;
    }
    let active = true;
    setTenantError('');
    apiService.getTenantBySlug(slug).then((res) => {
      if (!active) return;
      if (res.success && res.data) setTenant(res.data);
      else {
        setTenant(null);
        setTenantError(res.error ?? 'Restaurante no encontrado');
      }
    });
    return () => {
      active = false;
    };
  }, [slug]);

  if (user) return <Navigate to={getDefaultRoute()} replace />;
  if (!authLoading && isAuthenticated && tenantMissing) return <Navigate to="/sin-restaurante" replace />;

  const handleLogin = async () => {
    setBusy(true);
    setError('');
    try {
      await login();
    } catch (err) {
      setError(err instanceof LoginError ? err.message : 'Error al iniciar sesión. Intente de nuevo.');
      setBusy(false);
    }
  };

  const applyDevSlug = () => {
    const s = devSlug.trim().toLowerCase();
    if (!isValidSlug(s)) {
      setError('Slug no válido');
      return;
    }
    setDevTenantSlug(s);
    setSlug(s);
    setError('');
  };

  const logo = assetUrl(tenant?.config?.imagen);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            {logo ? (
              <img src={logo} alt={tenant?.nombre ?? 'Logo'} className="w-20 h-20 rounded-xl object-cover mx-auto mb-4" />
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl mb-4">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{tenant?.nombre ?? appConfig.brandName}</h1>
            <p className="text-gray-600 mt-2">{tenant ? appConfig.brandName : 'Sistema de gestión para restaurantes'}</p>
            {slug && <p className="text-xs text-gray-400 mt-1 font-mono">{tenantHostLabel(slug)}</p>}
          </div>

          {(error || tenantError) && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">{error || tenantError}</div>
          )}

          {slug && tenant ? (
            <button
              onClick={handleLogin}
              disabled={busy || authLoading}
              className="w-full flex items-center justify-center gap-3 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <LogIn className="w-5 h-5" />
              {busy ? 'Redirigiendo...' : 'Iniciar sesión'}
            </button>
          ) : (
            !slug && (
              <div className="text-sm text-gray-600 text-center space-y-2">
                <p>Abre la dirección de tu restaurante para iniciar sesión.</p>
                <p>
                  ¿Aún no tienes uno?{' '}
                  <a href={`${appUrl()}/onboarding`} className="text-orange-600 font-medium hover:underline">
                    Regístralo gratis
                  </a>
                </p>
              </div>
            )
          )}

          {isLocalHost() && (
            <div className="mt-6 border-t border-dashed border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-2">Entorno local: restaurante de pruebas (slug)</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={devSlug}
                  onChange={(e) => setDevSlug(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyDevSlug()}
                  placeholder="demo"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  aria-label="Slug del restaurante"
                />
                <button onClick={applyDevSlug} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
                  Usar
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">Al iniciar sesión, aceptas los términos y condiciones del servicio.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
