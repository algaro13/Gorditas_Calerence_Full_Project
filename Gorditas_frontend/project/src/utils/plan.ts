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

export const etiquetaDeEstadoDePlan = (estado: PlanStatus | undefined | null): string => (estado ? (ESTADOS[estado] ?? estado) : '');

/** El plan Empresarial guarda 999 como «sin límite». */
export const LIMITE_SIN_TOPE = 999;

/** Días completos que faltan para `fecha`, nunca negativos. */
export const diasHasta = (fecha: string | Date, ahora: number = Date.now()): number =>
  Math.max(0, Math.ceil((new Date(fecha).getTime() - ahora) / 86_400_000));

/** «2 de noviembre de 2026». */
export const fechaLarga = (fecha: string | Date): string =>
  new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
