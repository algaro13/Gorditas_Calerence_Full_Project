import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Retorno de Zitadel: espera a que la sesión y el restaurante estén listos y redirige. */
const Callback: React.FC = () => {
  const { user, loading, error, tenantMissing, isAuthenticated, getDefaultRoute } = useAuth();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
        <p className="text-sm text-gray-600">Iniciando sesión...</p>
      </div>
    );
  }

  if (user) return <Navigate to={getDefaultRoute()} replace />;
  if (isAuthenticated && tenantMissing) return <Navigate to="/sin-restaurante" replace />;
  return <Navigate to="/login" replace />;
};

export default Callback;
