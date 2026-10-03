import type { PlanId, PlanStatus } from '../types';

/**
 * Cómo se lee el plan en pantalla.
 *
 * El plan viaja como identificador —`trial`, `past_due`— y así se compara. `/planes` lo mostraba
 * tal cual («Plan actual: trial (trial)») y el panel traducía los nombres a mano en su propio
 * `if`. Aquí se traduce una sola vez, para mostrar; nunca para comparar.
 */
const PLANES: Record<PlanId, string> = {
  trial: 'Prueba gratuita',
  basico: 'Básico',
  profesional: 'Profesional',
  empresarial: 'Empresarial',
};

const ESTADOS: Record<PlanStatus, string> = {
  trial: 'En prueba',
  active: 'Activo',
  past_due: 'Pago pendiente',
  canceled: 'Cancelado',
  expired: 'Vencido',
};

export const nombreDePlan = (plan: PlanId | undefined | null): string => (plan ? (PLANES[plan] ?? plan) : '');

/**
 * Una prueba vencida conserva el estado `trial`: vencida es algo que se deduce de la fecha. Sin
 * pasarla, `/planes` decía «En prueba» justo debajo de «Tu periodo de prueba terminó».
 */
export const pruebaVencida = (estado: PlanStatus | undefined | null, trialEndsAt: string | null | undefined, ahora: number = Date.now()): boolean =>
  estado === 'trial' && !!trialEndsAt && new Date(trialEndsAt).getTime() <= ahora;

export const etiquetaDeEstadoDePlan = (estado: PlanStatus | undefined | null, trialEndsAt?: string | null): string =>
  pruebaVencida(estado, trialEndsAt) ? 'Prueba vencida' : estado ? (ESTADOS[estado] ?? estado) : '';

/** Días completos que faltan para `fecha`, nunca negativos. */
export const diasHasta = (fecha: string | Date, ahora: number = Date.now()): number =>
  Math.max(0, Math.ceil((new Date(fecha).getTime() - ahora) / 86_400_000));

/**
 * Días de calendario entre hoy y `fecha`: 0 si es hoy, 1 si es mañana.
 *
 * No es `diasHasta`: esa cuenta periodos de 24 horas y redondea hacia arriba, así que una prueba
 * que termina esta noche daba «queda 1 día» junto a la fecha de hoy.
 */
export const diasDeCalendarioHasta = (fecha: string | Date, ahora: Date = new Date()): number => {
  const f = new Date(fecha);
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const dia = new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
  return Math.round((dia - hoy) / 86_400_000);
};

/** «termina hoy», «termina mañana» o «termina el 25 de octubre de 2026 (quedan 23 días)». */
export const cuandoTerminaLaPrueba = (fecha: string | Date, ahora: Date = new Date()): string => {
  const dias = diasDeCalendarioHasta(fecha, ahora);
  if (dias <= 0) return 'termina hoy';
  if (dias === 1) return 'termina mañana';
  return `termina el ${fechaLarga(fecha)} (quedan ${dias} días)`;
};

/** «2 de noviembre de 2026». */
export const fechaLarga = (fecha: string | Date): string =>
  new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
