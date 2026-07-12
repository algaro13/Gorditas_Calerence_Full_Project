import React from 'react';
import { LogOut, User, Settings, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  // Load tenant config from localStorage
  const tenantConfig = JSON.parse(localStorage.getItem('tenantConfig') || '{}');
  const tenantNombre = localStorage.getItem('tenantNombre') || 'Sistema Restaurante';
  const tenantImagen = tenantConfig.imagen || null;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-full mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Botón de hamburguesa para abrir panel completo */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Abrir menú completo"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-2">
              {tenantImagen ? (
                <img
                  src={`http://localhost:5000${tenantImagen}`}
                  alt="Logo"
                  className="w-10 h-10 rounded-lg object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">{tenantNombre}</h1>
                <p className="text-sm text-gray-600">Panel de Administración</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.nombre}</p>
                    <p className="text-xs text-gray-600">{user.nombreTipoUsuario}</p>
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;