import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CreditCard, ExternalLink, Users, Wallet } from 'lucide-react';
import { Aviso } from '../components/Aviso';
import { AvisoSobreCupo } from '../components/AvisoSobreCupo';
import { apiService } from '../services/api';
import type { EstadoDeCupo, EstadoSuscripcion, PlanStatus } from '../types';
import { LIMITE_SIN_TOPE, cuandoTerminaLaPrueba, etiquetaDeEstadoDePlan, fechaLarga, nombreDePlan, pruebaVencida } from '../utils/plan';

const PASTILLA: Record<PlanStatus, string> = {
  trial: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  past_due: 'bg-red-100 text-red-800',
  canceled: 'bg-gray-200 text-gray-800',
  expired: 'bg-gray-200 text-gray-800',
};

/** Qué pasa con la suscripción y cuándo, en una frase. */
function cuandoPasaAlgo(s: EstadoSuscripcion): string | null {
  if (s.planStatus === 'trial' && s.trialEndsAt) {
    if (pruebaVencida(s.planStatus, s.trialEndsAt)) return `Tu prueba terminó el ${fechaLarga(s.trialEndsAt)}.`;
    return `Tu prueba ${cuandoTerminaLaPrueba(s.trialEndsAt)}.`;
  }
  if (s.cancelAt) return `Cancelaste la suscripción: sigue funcionando hasta el ${fechaLarga(s.cancelAt)}.`;
  if (s.planStatus === 'active' && s.currentPeriodEnd) return `Se renueva el ${fechaLarga(s.currentPeriodEnd)}.`;
  return null;
}

/**
 * La suscripción del restaurante, para el administrador.
 *
 * Antes no había dónde verla: el menú no la mencionaba y `/planes` es una página de venta. Cambiar
 * de tarjeta, cancelar y descargar facturas se sigue haciendo en el portal de Stripe; esta
 * pantalla dice en qué punto está todo y lleva allí.
 */
const Suscripcion: React.FC = () => {
  const [estado, setEstado] = useState<EstadoSuscripcion | null>(null);
  // Solo si sobra gente: es lo que dice el plazo y los nombres, igual que en Catálogos.
  const [cupo, setCupo] = useState<EstadoDeCupo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abriendoPortal, setAbriendoPortal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiService.getBillingStatus().then(async (res) => {
      if (res.success && res.data) {
        setEstado(res.data);
        if (res.data.usuariosActivos > res.data.maxUsuarios) {
          const c = await apiService.getCupo();
          if (c.success && c.data?.excedido) setCupo(c.data);
        }
      } else setError(res.error || 'No se pudo cargar la suscripción');
      setCargando(false);
    });
  }, []);

  const abrirPortal = async () => {
    setAbriendoPortal(true);
    setError('');
    const res = await apiService.createPortal();
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
      return;
    }
    setError(res.error || 'No se pudo abrir el portal de pagos');
    setAbriendoPortal(false);
  };

  const sinTope = (estado?.maxUsuarios ?? 0) >= LIMITE_SIN_TOPE;
  const ocupacion = estado && !sinTope ? Math.min(100, Math.round((estado.usuariosActivos / estado.maxUsuarios) * 100)) : 0;
  const lleno = estado !== null && !sinTope && estado.usuariosActivos >= estado.maxUsuarios;
  const excedido = cupo !== null && estado !== null && estado.usuariosActivos > estado.maxUsuarios;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="w-6 h-6 text-gray-700" />
        <h1 className="text-pantalla font-bold text-gray-900">Suscripción</h1>
      </div>

      <Aviso error={error} />

      {cargando && <p className="text-cuerpo text-gray-500">Cargando…</p>}

      {estado && (
        <>
          {estado.planStatus === 'past_due' && (
            <div role="alert" className="flex items-start gap-sp-2 rounded-xl border border-red-200 bg-red-50 p-sp-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 text-red-600" />
              <div>
                <p className="text-cuerpo font-semibold text-red-900">No pudimos cobrar tu último pago</p>
                <p className="text-cuerpo text-red-800 mt-1">
                  Tu punto de venta sigue funcionando mientras reintentamos el cobro. Actualiza tu
                  método de pago para que no se ponga en pausa.
                </p>
              </div>
            </div>
          )}

          <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="plan-actual">
            <p className="text-meta text-gray-500">Plan actual</p>
            <div className="flex flex-wrap items-center gap-sp-2 mt-1">
              <h2 id="plan-actual" className="text-titulo font-bold text-gray-900">{nombreDePlan(estado.plan)}</h2>
              <span className={`rounded-full px-3 py-1 text-meta font-medium ${PASTILLA[estado.planStatus] ?? PASTILLA.canceled}`}>
                {/* El pago pendiente manda: sin cobro, el restaurante puede pausarse antes de la
                    fecha de cancelación. La fecha se sigue diciendo debajo. */}
                {estado.cancelAt && estado.planStatus === 'active' ? 'Cancelación programada' : etiquetaDeEstadoDePlan(estado.planStatus, estado.trialEndsAt)}
              </span>
            </div>
            {cuandoPasaAlgo(estado) && (
              <p className="flex items-start gap-sp-1 text-cuerpo text-gray-700 mt-sp-2">
                <CalendarClock className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-500" />
                {cuandoPasaAlgo(estado)}
              </p>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-sm p-6" aria-labelledby="usuarios-plan">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <h2 id="usuarios-plan" className="text-titulo font-semibold text-gray-900">Usuarios</h2>
            </div>
            <p className="text-cuerpo text-gray-700 mt-sp-2">
              {sinTope
                ? `${estado.usuariosActivos} usuarios activos · tu plan no tiene límite`
                : `${estado.usuariosActivos} de ${estado.maxUsuarios} usuarios activos`}
            </p>
            {!sinTope && (
              <div className="mt-sp-2 h-2 w-full rounded-full bg-gray-100" aria-hidden>
                <div className={`h-2 rounded-full ${lleno ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${ocupacion}%` }} />
              </div>
            )}
            {excedido && cupo && (
              <div className="mt-sp-2">
                <AvisoSobreCupo
                  cupo={cupo}
                  activos={estado.usuariosActivos}
                  comoAjustar={
                    <>
                      Para evitarlo: desactiva {cupo.sobran} usuario{cupo.sobran === 1 ? '' : 's'} en Catálogos → Usuarios, o
                      cambia a un plan más grande.
                    </>
                  }
                />
              </div>
            )}
            {lleno && !excedido && (
              <p className="text-meta text-gray-500 mt-sp-2">
                {estado.planStatus === 'trial'
                  ? 'Llegaste al límite de la prueba. Para invitar a más personas, elige un plan con más usuarios.'
                  : 'Llegaste al límite de tu plan. Para invitar a más personas, cambia a un plan mayor.'}
              </p>
            )}
            <Link to="/catalogos" className="mt-sp-1 inline-flex min-h-control-min items-center text-cuerpo text-orange-700 underline hover:text-orange-900">
              Administrar el personal en Catálogos
            </Link>
          </section>

          <section className="bg-white rounded-xl shadow-sm p-6 space-y-sp-3" aria-labelledby="acciones-suscripcion">
            <h2 id="acciones-suscripcion" className="text-titulo font-semibold text-gray-900">Administrar</h2>
            {/* Con un pago pendiente la acción que importa es el pago: va primero y es la única
                destacada. Dos botones de color compiten por el mismo dedo. */}
            <div className={`flex gap-sp-2 ${estado.planStatus === 'past_due' ? 'flex-col-reverse sm:flex-row-reverse sm:justify-end' : 'flex-col sm:flex-row'}`}>
              <Link
                to="/planes"
                className={`inline-flex min-h-control items-center justify-center gap-2 rounded-lg px-sp-4 text-cuerpo font-medium ${
                  estado.planStatus === 'past_due' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {estado.planStatus === 'trial' ? 'Elegir un plan' : 'Cambiar de plan'}
              </Link>
              {estado.tieneClienteStripe && (
                <button
                  onClick={abrirPortal}
                  disabled={abriendoPortal}
                  className={`inline-flex min-h-control items-center justify-center gap-2 rounded-lg px-sp-4 text-cuerpo font-medium disabled:opacity-50 ${
                    estado.planStatus === 'past_due' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  {abriendoPortal ? 'Abriendo…' : estado.planStatus === 'past_due' ? 'Actualizar método de pago' : 'Administrar pago y facturas'}
                  <ExternalLink className="w-4 h-4 opacity-70" aria-hidden />
                </button>
              )}
            </div>
            <p className="text-meta text-gray-500">
              {estado.tieneClienteStripe
                ? 'El método de pago, las facturas y la cancelación se gestionan en el portal seguro de Stripe.'
                : 'Cuando contrates un plan podrás ver aquí tus facturas y tu método de pago.'}
            </p>
          </section>
        </>
      )}
    </div>
  );
};

export default Suscripcion;
