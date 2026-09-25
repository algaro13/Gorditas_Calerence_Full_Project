import React from 'react';
import { Navigate } from 'react-router-dom';
import { Store, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { appUrl } from '../config/tenant-host';

/** Sesión válida pero la organización del token no tiene restaurante (o el usuario no tiene rol). */
const SinRestaurante: React.FC = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <Store className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h1 className="text-titulo font-bold text-gray-900 mb-2">Este acceso no tiene restaurante</h1>
        <p className="text-cuerpo text-gray-600 mb-6">
          Tu cuenta es válida, pero no está asociada a ningún restaurante registrado o no tiene un rol asignado.
          Pide al administrador que te invite, o registra tu propio negocio.
        </p>
        <div className="flex flex-col gap-3">
          <a href={`${appUrl()}/onboarding`} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Registrar mi restaurante
          </a>
          <button onClick={() => void logout()} className="btn gap-2 text-gray-600 hover:text-red-600">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default SinRestaurante;
