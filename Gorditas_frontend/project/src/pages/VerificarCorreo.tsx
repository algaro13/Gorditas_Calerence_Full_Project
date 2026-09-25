import React, { useState } from 'react';
import { Aviso } from '../components/Aviso';
import { Navigate } from 'react-router-dom';
import { Mail, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

/** Pantalla para quien registró su restaurante pero todavía no abrió el enlace del correo. */
const VerificarCorreo: React.FC = () => {
  const { user, correoPorVerificar, correoPendiente, loading, refreshTenant, logout } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
      </div>
    );
  }
  if (!correoPorVerificar) return <Navigate to="/" replace />;

  const reenviar = async () => {
    setEnviando(true);
    setAviso('');
    setError('');
    const res = await apiService.reenviarVerificacion();
    if (res.success) setAviso(res.message || 'Te enviamos un correo nuevo.');
    else setError(res.error || 'No se pudo reenviar el correo.');
    setEnviando(false);
  };

  const yaVerifique = async () => {
    setEnviando(true);
    await refreshTenant();
    setEnviando(false);
    setAviso('Si ya abriste el enlace y sigues viendo esta pantalla, espera unos segundos y vuelve a intentar.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
          <Mail className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className="text-titulo font-bold text-gray-900 mb-2">Confirma tu correo</h1>
        <p className="text-cuerpo text-gray-600 mb-6">
          Te enviamos un enlace a <strong className="break-all">{correoPendiente || user?.email}</strong>. Ábrelo para activar tu
          cuenta y empezar a usar el sistema. Si no lo ves, revisa la carpeta de correo no deseado.
        </p>

        {aviso && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-cuerpo mb-4">{aviso}</div>}
        <Aviso error={error} />

        <div className="flex flex-col gap-3">
          <button
            onClick={yaVerifique}
            disabled={enviando}
            className="btn gap-2 bg-orange-600 text-white hover:bg-orange-700"
          >
            <RefreshCw className={`w-4 h-4 ${enviando ? 'animate-spin' : ''}`} /> Ya confirmé mi correo
          </button>
          <button onClick={reenviar} disabled={enviando} className="btn text-orange-700 hover:text-orange-900">
            Volver a enviarme el enlace
          </button>
          <button onClick={() => void logout()} className="btn gap-2 text-gray-500 hover:text-red-600">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificarCorreo;
