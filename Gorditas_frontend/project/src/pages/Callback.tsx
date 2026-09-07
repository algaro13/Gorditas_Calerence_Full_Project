import React, { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTenantSlug } from '../config/tenant-host';

/** Retorno de Zitadel: espera a que la sesión y el restaurante estén listos y redirige. */
const Callback: React.FC = () => {
  const { user, tenant, loading, error, tenantMissing, isAuthenticated, getDefaultRoute } = useAuth();

  // Cuando el acceso fue por el dominio principal no hay restaurante en la dirección, así que se
  // lleva a la persona al suyo. `sso=1` hace que allá el acceso se complete sin volver a pedir nada,
  // aprovechando la sesión que Zitadel ya tiene abierta.
  const enPlataforma = getTenantSlug() === null;
  const destino = enPlataforma && tenant?.url ? new URL(tenant.url) : null;
  const hayQueSaltar = destino !== null && destino.origin !== window.location.origin;

  useEffect(() => {
    if (!loading && user && hayQueSaltar && destino) {
      window.location.replace(`${destino.origin}/login?sso=1`);
    }
  }, [loading, user, hayQueSaltar, destino]);

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">No se pudo iniciar sesión</h1>
          <p className="text-sm text-gray-600 mb-6 break-words">{error}</p>
          <Link to="/login" className="inline-block px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Volver a intentar
          </Link>
        </div>
      </div>
    );
  }

  if (loading || (user && hayQueSaltar)) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
        <p className="text-sm text-gray-600">{user && hayQueSaltar ? 'Entrando a tu restaurante...' : 'Iniciando sesión...'}</p>
      </div>
    );
  }

  if (user) return <Navigate to={getDefaultRoute()} replace />;
  if (isAuthenticated && tenantMissing) return <Navigate to="/sin-restaurante" replace />;
  return <Navigate to="/login" replace />;
};

export default Callback;
