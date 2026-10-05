import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth as useOidc } from 'react-oidc-context';
import { Activity, Archive, ChefHat, LogOut, Pause, Play, RefreshCw, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { scopesForOrg } from '../config/auth-config';
import { apiService } from '../services/api';
import type { FaseRetencion, FilaConsola, ResumenConsola, SituacionRestaurante, TramoActividad } from '../types';
import { decodeJwtPayload, orgIdFromClaims } from '../utils/claims';
import { fechaLarga, nombreDePlan } from '../utils/plan';

const SITUACIONES: Record<SituacionRestaurante, { texto: string; estilo: string }> = {
  prueba: { texto: 'En prueba', estilo: 'bg-blue-100 text-blue-800' },
  'prueba-vencida': { texto: 'Prueba vencida', estilo: 'bg-gray-200 text-gray-800' },
  pago: { texto: 'De pago', estilo: 'bg-green-100 text-green-800' },
  'pago-pendiente': { texto: 'Pago pendiente', estilo: 'bg-red-100 text-red-800' },
  cancelado: { texto: 'Cancelado', estilo: 'bg-gray-200 text-gray-800' },
  'plan-sin-stripe': { texto: 'Plan sin Stripe', estilo: 'bg-amber-100 text-amber-800' },
};

const TRAMOS: Record<TramoActividad, string> = {
  'hasta-7': 'Usados en los últimos 7 días',
  'de-8-a-30': 'Sin uso de 8 a 30 días',
  'de-31-a-90': 'Sin uso de 31 a 90 días',
  'mas-de-90': 'Sin uso hace más de 90 días',
};

const FASES: Record<FaseRetencion, { texto: string; estilo: string }> = {
  'en-uso': { texto: 'Sin avisos', estilo: 'bg-gray-100 text-gray-700' },
  'aviso-1': { texto: 'Primer aviso enviado', estilo: 'bg-amber-100 text-amber-800' },
  'aviso-2': { texto: 'Segundo aviso enviado', estilo: 'bg-orange-100 text-orange-800' },
  archivado: { texto: 'Archivado', estilo: 'bg-red-100 text-red-800' },
  'listo-para-borrar': { texto: 'Listo para borrar', estilo: 'bg-red-600 text-white' },
};

const PASOS: Record<string, string> = {
  'inactividad-1': 'mandará el primer aviso',
  'inactividad-2': 'mandará el segundo aviso',
  archivado: 'lo archivará',
};

const fechaCorta = (f: string | null) => (f ? new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const pesos = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

/** Qué fecha importa según la situación: fin de prueba, renovación o cancelación. */
function fechaClave(r: FilaConsola): string {
  if (r.situacion === 'prueba' || r.situacion === 'prueba-vencida') return r.trialEndsAt ? `Prueba hasta el ${fechaLarga(r.trialEndsAt)}` : 'Prueba sin fecha';
  if (r.cancelAt) return `Termina el ${fechaLarga(r.cancelAt)}`;
  if (r.currentPeriodEnd) return `Renueva el ${fechaLarga(r.currentPeriodEnd)}`;
  return '';
}

/**
 * Lo que el operador puede hacer con la retención de un restaurante. Borrar pide escribir el
 * subdominio: no hay vuelta atrás.
 */
const AccionesRetencion: React.FC<{ r: FilaConsola; alCambiar: () => Promise<void> }> = ({ r, alCambiar }) => {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [borrando, setBorrando] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const { fase, categoria, siguientePaso, recuperableHasta } = r.retencion;

  const hacer = async (accion: () => Promise<{ success: boolean; error?: string }>) => {
    setOcupado(true);
    setError('');
    const res = await accion();
    if (res.success) {
      setBorrando(false);
      setConfirmacion('');
      await alCambiar();
    } else setError(res.error || 'No se pudo completar');
    setOcupado(false);
  };

  const cancelarBorrado = () => {
    setBorrando(false);
    setConfirmacion('');
  };

  if (categoria === 'protegida' && !r.archivadoAt) return null;

  let nota = '';
  if (recuperableHasta) {
    nota = fase === 'listo-para-borrar' ? `Se pudo recuperar hasta el ${fechaLarga(recuperableHasta)}` : `Se puede recuperar hasta el ${fechaLarga(recuperableHasta)}`;
  } else if (siguientePaso) {
    nota = `Hoy el sistema ${PASOS[siguientePaso]}`;
  }

  return (
    <div className="mt-sp-2 border-t pt-sp-2">
      <div className="flex flex-wrap items-center gap-sp-2">
        {fase !== 'en-uso' && <span className={`rounded-full px-3 py-1 text-meta font-medium ${FASES[fase].estilo}`}>{FASES[fase].texto}</span>}
        {r.retencionPausada && <span className="rounded-full bg-blue-100 px-3 py-1 text-meta font-medium text-blue-800">Avisos en pausa</span>}
        {nota && <span className="text-meta text-gray-500">{nota}</span>}
      </div>
      <div className="mt-sp-2 flex flex-wrap gap-sp-2">
        {r.archivadoAt && (
          <button disabled={ocupado} onClick={() => hacer(() => apiService.restaurarRestaurante(r.id))} className="btn border border-gray-300 bg-white text-gray-800 disabled:opacity-50">
            <RotateCcw className="h-4 w-4" /> Restaurar
          </button>
        )}
        {!r.archivadoAt && (
          <button
            disabled={ocupado}
            onClick={() => hacer(() => apiService.pausarRetencion(r.id, !r.retencionPausada))}
            className="btn border border-gray-300 bg-white text-gray-800 disabled:opacity-50"
          >
            {r.retencionPausada ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {r.retencionPausada ? 'Reanudar avisos' : 'Pausar avisos'}
          </button>
        )}
        {fase === 'listo-para-borrar' && !borrando && (
          <button disabled={ocupado} onClick={() => setBorrando(true)} className="btn border border-red-300 bg-white text-red-700 disabled:opacity-50">
            <Trash2 className="h-4 w-4" /> Aprobar borrado
          </button>
        )}
      </div>
      {borrando && (
        <div className="mt-sp-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-cuerpo text-red-900">
            Se borran para siempre sus datos, sus usuarios y sus archivos. No se puede deshacer. Escribe <strong>{r.slug}</strong> para confirmar.
          </p>
          <input
            className="campo mt-sp-2"
            aria-label={`Escribe ${r.slug} para confirmar`}
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="off"
          />
          <div className="mt-sp-2 flex flex-wrap gap-sp-2">
            <button
              disabled={ocupado || confirmacion !== r.slug}
              onClick={() => hacer(() => apiService.borrarRestaurante(r.id, confirmacion))}
              className="btn bg-red-600 text-white disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Borrar para siempre
            </button>
            <button disabled={ocupado} onClick={cancelarBorrado} className="btn border border-gray-300 bg-white text-gray-800">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-sp-2 text-cuerpo text-red-700">{error}</p>}
    </div>
  );
};

/**
 * Consola de plataforma: todos los restaurantes, su plan y su actividad. Solo para quien opera la
 * plataforma (rol «Plataforma» en la organización de la plataforma). Además de leer, lleva el ciclo
 * de inactividad: restaurar, pausar los avisos y aprobar el borrado; todo queda en la bitácora.
 *
 * Vive fuera del resto de la aplicación: el operador no pertenece a ningún restaurante, así que
 * no pasa por las pantallas que necesitan uno.
 */
const Plataforma: React.FC = () => {
  const oidc = useOidc();
  const [orgPlataforma, setOrgPlataforma] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenConsola | null>(null);
  const [cargando, setCargando] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');
  const [filtroSituacion, setFiltroSituacion] = useState<SituacionRestaurante | ''>('');
  const [filtroTramo, setFiltroTramo] = useState<TramoActividad | ''>('');
  const [filtroFase, setFiltroFase] = useState<FaseRetencion | ''>('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    apiService.getPlataformaAcceso().then((r) => {
      if (r.success && r.data) setOrgPlataforma(r.data.orgId);
      else setError('No se pudo conectar con el servidor');
    });
  }, []);

  // La sesión abierta, ¿es de la organización de la plataforma? Una de restaurante no sirve aquí.
  const token = oidc.user?.access_token ?? null;
  const orgDeLaSesion = useMemo(() => (token ? orgIdFromClaims(decodeJwtPayload(token)) : null), [token]);
  const sesionDePlataforma = !!orgPlataforma && orgDeLaSesion === orgPlataforma;

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    const r = await apiService.getPlataformaResumen();
    if (r.success && r.data) setResumen(r.data);
    else if (r.status === 403) setSinPermiso(true);
    else setError(r.error || 'No se pudo cargar el resumen');
    setCargando(false);
  }, []);

  useEffect(() => {
    if (sesionDePlataforma) void cargar();
  }, [sesionDePlataforma, cargar]);

  const entrar = () => {
    if (!orgPlataforma) return;
    void oidc.signinRedirect({ scope: scopesForOrg(orgPlataforma), state: { destino: '/plataforma' } });
  };
  // Al destino de salida registrado en Zitadel (la raíz del sitio): `/plataforma` no lo está, y
  // pedirlo hacía que Zitadel rechazara el cierre de sesión.
  const salir = () => void oidc.signoutRedirect();

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (resumen?.restaurantes ?? []).filter(
      (r) =>
        (!filtroSituacion || r.situacion === filtroSituacion) &&
        (!filtroTramo || r.tramo === filtroTramo) &&
        (!filtroFase || r.retencion.fase === filtroFase) &&
        (!q || r.nombre.toLowerCase().includes(q) || r.slug.includes(q)),
    );
  }, [resumen, filtroSituacion, filtroTramo, filtroFase, busqueda]);

  const encabezado = (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-sp-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <span className="text-titulo font-bold">
            Kustodela <span className="text-gray-500">· Plataforma</span>
          </span>
        </div>
        {sesionDePlataforma && (
          <button onClick={salir} className="btn border border-gray-300 bg-white text-gray-800">
            <LogOut className="h-4 w-4" />
            <span>Salir</span>
          </button>
        )}
      </div>
    </header>
  );

  // Sin sesión de plataforma: la puerta de entrada.
  if (!sesionDePlataforma || sinPermiso) {
    return (
      <div className="min-h-screen bg-gray-50">
        {encabezado}
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-gray-700" />
          <h1 className="mb-2 text-pantalla font-bold">Consola de plataforma</h1>
          {sinPermiso ? (
            <>
              <p className="mb-6 text-cuerpo text-gray-600">Esta cuenta no tiene acceso a la consola. Solo entra quien opera la plataforma.</p>
              <button onClick={salir} className="btn btn-primario w-full">
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <p className="mb-6 text-cuerpo text-gray-600">
                Restaurantes, planes y actividad. Solo para quien opera Kustodela; cada consulta queda registrada.
              </p>
              <button onClick={entrar} disabled={!orgPlataforma} className="btn btn-lg btn-primario w-full disabled:opacity-50">
                Entrar como operador
              </button>
              {orgDeLaSesion && !sesionDePlataforma && (
                <p className="mt-sp-3 text-meta text-gray-500">Tienes abierta la sesión de un restaurante: al entrar como operador se reemplaza.</p>
              )}
            </>
          )}
          {error && <p className="mt-sp-3 text-cuerpo text-red-700">{error}</p>}
        </main>
      </div>
    );
  }

  const tarjeta = (titulo: string, valor: React.ReactNode, detalle?: React.ReactNode) => (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-meta text-gray-500">{titulo}</p>
      <p className="mt-1 text-pantalla font-bold text-gray-900">{valor}</p>
      {detalle && <p className="mt-1 text-meta text-gray-600">{detalle}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {encabezado}
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-sp-2">
          <div>
            <h1 className="text-pantalla font-bold">Restaurantes</h1>
            {resumen && <p className="text-meta text-gray-500">Actualizado: {new Date(resumen.generadoEl).toLocaleString('es-MX')} · Esta consulta queda registrada.</p>}
          </div>
          <button onClick={cargar} disabled={cargando} className="btn border border-gray-300 bg-white text-gray-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {error && <p className="text-cuerpo text-red-700">{error}</p>}
        {!resumen && cargando && <p className="text-cuerpo text-gray-600">Cargando…</p>}

        {resumen && (
          <>
            <section className="grid grid-cols-2 gap-sp-2 lg:grid-cols-4" aria-label="Números">
              {tarjeta('Restaurantes', resumen.total)}
              {tarjeta(
                'De pago',
                resumen.porSituacion.pago + resumen.porSituacion['pago-pendiente'],
                `Básico ${resumen.pagoPorPlan.basico} · Profesional ${resumen.pagoPorPlan.profesional} · Empresarial ${resumen.pagoPorPlan.empresarial}`,
              )}
              {tarjeta('En prueba', resumen.porSituacion.prueba, `${resumen.porSituacion['prueba-vencida']} con la prueba vencida`)}
              {tarjeta('Ingreso mensual', pesos(resumen.ingresoMensual), 'Suscripciones vivas, a precio de catálogo')}
              {tarjeta(
                'Conversión',
                resumen.conversion.porcentaje === null ? '—' : `${resumen.conversion.porcentaje}%`,
                `${resumen.conversion.pagaron} de ${resumen.conversion.terminaronPrueba} que terminaron la prueba`,
              )}
              {tarjeta('Pago pendiente', resumen.porSituacion['pago-pendiente'])}
              {tarjeta('Cancelados', resumen.porSituacion.cancelado)}
              {tarjeta('Plan sin Stripe', resumen.porSituacion['plan-sin-stripe'], 'Operan sin pagar por Stripe')}
            </section>

            <section className="rounded-xl bg-white p-4 shadow-sm" aria-label="Actividad">
              <h2 className="mb-sp-2 flex items-center gap-2 text-titulo font-semibold">
                <Activity className="h-5 w-5 text-gray-500" /> Actividad
              </h2>
              <div className="grid grid-cols-2 gap-sp-2 lg:grid-cols-4">
                {(Object.keys(TRAMOS) as TramoActividad[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFiltroTramo(filtroTramo === t ? '' : t)}
                    aria-pressed={filtroTramo === t}
                    className={`rounded-lg border p-3 text-left ${filtroTramo === t ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-800'}`}
                  >
                    <span className="block text-titulo font-bold">{resumen.porTramo[t]}</span>
                    <span className="block text-meta">{TRAMOS[t]}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl bg-white p-4 shadow-sm" aria-label="Retención">
              <h2 className="mb-1 flex items-center gap-2 text-titulo font-semibold">
                <Archive className="h-5 w-5 text-gray-500" /> Retención
              </h2>
              <p className="mb-sp-2 text-meta text-gray-500">
                Prueba sin pago: avisos a los 30 y 60 días sin uso, archivo a los 90. Pago cancelado: a los 365, 395 y 425. Lo que paga
                nunca entra. Borrar solo lo apruebas tú, 30 días después de archivar.
              </p>
              <div className="grid grid-cols-2 gap-sp-2 lg:grid-cols-4">
                {(['aviso-1', 'aviso-2', 'archivado', 'listo-para-borrar'] as FaseRetencion[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroFase(filtroFase === f ? '' : f)}
                    aria-pressed={filtroFase === f}
                    className={`rounded-lg border p-3 text-left ${filtroFase === f ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-800'}`}
                  >
                    <span className="block text-titulo font-bold">{resumen.porFase[f]}</span>
                    <span className="block text-meta">{FASES[f].texto}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-sp-2" aria-label="Lista de restaurantes">
              <div className="grid gap-sp-2 sm:grid-cols-3">
                <input
                  className="campo"
                  placeholder="Buscar por nombre o subdominio"
                  aria-label="Buscar restaurante"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <select className="campo" aria-label="Filtrar por situación" value={filtroSituacion} onChange={(e) => setFiltroSituacion(e.target.value as SituacionRestaurante | '')}>
                  <option value="">Todas las situaciones</option>
                  {(Object.keys(SITUACIONES) as SituacionRestaurante[]).map((s) => (
                    <option key={s} value={s}>
                      {SITUACIONES[s].texto}
                    </option>
                  ))}
                </select>
                <select className="campo" aria-label="Filtrar por actividad" value={filtroTramo} onChange={(e) => setFiltroTramo(e.target.value as TramoActividad | '')}>
                  <option value="">Toda la actividad</option>
                  {(Object.keys(TRAMOS) as TramoActividad[]).map((t) => (
                    <option key={t} value={t}>
                      {TRAMOS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-meta text-gray-500">
                {filas.length} de {resumen.total} · ordenados por días sin uso
              </p>

              <ul className="space-y-sp-2">
                {filas.map((r) => (
                  <li key={r.id} className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-sp-2">
                      <div className="min-w-0">
                        <p className="break-words text-titulo font-semibold text-gray-900">{r.nombre}</p>
                        <p className="text-meta text-gray-500">
                          {r.slug} · {nombreDePlan(r.plan)}
                          {!r.activo ? ' · desactivado' : ''}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-meta font-medium ${SITUACIONES[r.situacion].estilo}`}>{SITUACIONES[r.situacion].texto}</span>
                    </div>
                    <div className="mt-sp-2 grid grid-cols-2 gap-sp-2 text-meta text-gray-700 sm:grid-cols-4">
                      <p>
                        <span className="block text-titulo font-bold text-gray-900">{r.diasSinUso}</span>
                        días sin uso
                      </p>
                      <p>
                        <span className="block font-medium text-gray-900">{fechaCorta(r.ultimoAcceso)}</span>
                        último acceso
                      </p>
                      <p>
                        <span className="block font-medium text-gray-900">{fechaCorta(r.ultimaOrden)}</span>
                        última orden · {r.ordenes30d} en 30 días
                      </p>
                      <p>
                        <span className="block font-medium text-gray-900">{r.usuariosActivos}</span>
                        usuarios activos
                      </p>
                    </div>
                    <p className="mt-sp-2 text-meta text-gray-500">
                      Alta el {fechaLarga(r.creadoEl)}
                      {fechaClave(r) ? ` · ${fechaClave(r)}` : ''}
                    </p>
                    <AccionesRetencion r={r} alCambiar={cargar} />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Plataforma;
