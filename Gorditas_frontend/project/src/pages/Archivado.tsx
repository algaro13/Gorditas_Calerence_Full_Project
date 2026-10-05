import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Archive, LogOut, RotateCcw } from 'lucide-react';
import { Aviso } from '../components/Aviso';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { fechaLarga } from '../utils/plan';

/**
 * Un restaurante archivado por falta de uso. Sus datos siguen ahí hasta `recuperableHasta`; el
 * administrador lo recupera con un clic. Los demás solo pueden avisarle.
 */
const Archivado: React.FC = () => {
  const { tenant, hasPermission, accesoBloqueado, loading, refreshTenant, logout } = useAuth();
  const [recuperando, setRecuperando] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = hasPermission(['Admin']);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
      </div>
    );
  }
  if (accesoBloqueado !== 'RESTAURANTE_ARCHIVADO') return <Navigate to="/" replace />;

  const recuperar = async () => {
    setRecuperando(true);
    setError('');
    const res = await apiService.recuperarRestaurante();
    if (res.success) {
      // Al refrescar, AuthenticatedApp decide a dónde ir: al POS o, si la prueba ya terminó, a los planes.
      await refreshTenant();
      return;
    }
    setError(res.error || 'No se pudo recuperar el restaurante.');
    setRecuperando(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
          <Archive className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className="text-titulo font-bold text-gray-900 mb-2">{tenant?.nombre ?? 'Tu restaurante'} está archivado</h1>
        <p className="text-cuerpo text-gray-600 mb-6">
          Lo archivamos porque llevaba mucho tiempo sin usarse. Tus datos siguen guardados
          {tenant?.recuperableHasta ? (
            <>
              {' '}
              hasta el <strong>{fechaLarga(tenant.recuperableHasta)}</strong>
            </>
          ) : null}
          . {isAdmin ? 'Si lo recuperas, todo vuelve a estar como lo dejaste.' : 'Pídele a tu administrador que lo recupere.'}
        </p>

        <Aviso error={error} />

        <div className="flex flex-col gap-3">
          {isAdmin && (
            <button onClick={recuperar} disabled={recuperando} className="btn gap-2 btn-primario">
              <RotateCcw className={`w-4 h-4 ${recuperando ? 'animate-spin' : ''}`} /> Recuperar mi restaurante
            </button>
          )}
          <button onClick={() => void logout()} className="btn gap-2 text-gray-500 hover:text-red-600">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
};

export default Archivado;
