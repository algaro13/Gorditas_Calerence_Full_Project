import type { Role } from '../../../shared/domain/Auth';

export const ORDEN_ESTATUS = ['Pendiente', 'Recepcion', 'Preparacion', 'Surtida', 'Entregada', 'Pagada', 'Cancelado'] as const;
export type OrdenEstatus = (typeof ORDEN_ESTATUS)[number];

export function isOrdenEstatus(value: unknown): value is OrdenEstatus {
  return typeof value === 'string' && (ORDEN_ESTATUS as readonly string[]).includes(value);
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
