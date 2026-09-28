import type { Role } from '../../../shared/domain/Auth';

export const ORDEN_ESTATUS = ['Pendiente', 'Recepcion', 'Preparacion', 'Surtida', 'Entregada', 'Pagada', 'Cancelado'] as const;
export type OrdenEstatus = (typeof ORDEN_ESTATUS)[number];

export function isOrdenEstatus(value: unknown): value is OrdenEstatus {
  return typeof value === 'string' && (ORDEN_ESTATUS as readonly string[]).includes(value);
}

/**
 * Una orden pagada ya no cambia: ni sus líneas ni su total.
 *
 * Hasta ahora nada lo impedía —se podía añadir un platillo a una orden cobrada y el total se
 * recalculaba—, así que lo cobrado y lo que dice la orden podían separarse sin dejar rastro.
 * Con los descuentos derivados de las líneas es peor: un recálculo cambiaría en silencio el
 * importe que un cliente ya pagó.
 */
export function estaCongelada(estatus: OrdenEstatus): boolean {
  return estatus === 'Pagada';
}

const OPERATIVO: Partial<Record<OrdenEstatus, OrdenEstatus[]>> = {
  Pendiente: ['Recepcion'],
  Recepcion: ['Preparacion', 'Surtida', 'Entregada'],
  Preparacion: ['Surtida', 'Recepcion'],
  Surtida: ['Entregada', 'Pagada', 'Recepcion'],
  Entregada: ['Pagada', 'Recepcion'],
};

/** Tabla de transiciones por rol (portada del sistema anterior). Admin puede todo. */
export const TRANSICIONES: Record<Exclude<Role, 'Admin'>, Partial<Record<OrdenEstatus, OrdenEstatus[]>>> = {
  Encargado: OPERATIVO,
  Mesero: OPERATIVO,
  Despachador: {
    Recepcion: ['Preparacion', 'Surtida', 'Entregada'],
    Preparacion: ['Surtida'],
    Surtida: ['Entregada'],
  },
  Cocinero: {
    Recepcion: ['Preparacion', 'Surtida', 'Entregada'],
    Preparacion: ['Surtida'],
  },
};

/** Un usuario con varios roles puede si cualquiera de ellos lo permite. */
export function canTransition(current: OrdenEstatus, next: OrdenEstatus, roles: readonly Role[]): boolean {
  if (roles.includes('Admin')) return true;
  return roles.some((role) => {
    if (role === 'Admin') return true;
    const allowed = TRANSICIONES[role]?.[current];
    return allowed ? allowed.includes(next) : false;
  });
}
