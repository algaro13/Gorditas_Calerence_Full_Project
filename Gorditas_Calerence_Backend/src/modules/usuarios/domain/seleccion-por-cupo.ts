import type { Role } from '../../../shared/domain/Auth';

/** Lo mínimo que hace falta para elegir. Evita atar la regla al espejo completo. */
export interface CandidatoACupo {
  id: string;
  nombre: string;
  role: Role;
  activo: boolean;
  lastSeenAt: Date | null;
}

export interface SeleccionPorCupo<T extends CandidatoACupo> {
  /** A quién le toca, en orden. Puede ser menos de lo necesario (ver `quedanDeMas`). */
  elegidos: T[];
  /** Plazas que seguirán sobrando después de desactivar a los elegidos. */
  quedanDeMas: number;
}

/**
 * Elige a quién desactivar cuando un restaurante excede su cupo.
 *
 * El criterio es el tiempo sin entrar, y los que nunca entraron van primero. Casi siempre es
 * la persona correcta: alguien que ya dejó de usar el sistema. A igualdad, se ordena por
 * nombre para que la elección sea estable entre corridas — si el aviso anuncia un nombre, el
 * día del vencimiento tiene que tocarle a ese y no a otro.
 *
 * Al último administrador activo no se le toca nunca. Si para caber haría falta quitarlo, se
 * devuelve una selección más corta y `quedanDeMas` lo dice: el restaurante se queda con una
 * plaza de más, que es preferible a dejarlo sin nadie que pueda administrarlo.
 */
export function elegirPorCupo<T extends CandidatoACupo>(miembros: T[], maxUsuarios: number): SeleccionPorCupo<T> {
  const activos = miembros.filter((m) => m.activo);
  const sobran = activos.length - maxUsuarios;
  if (sobran <= 0) return { elegidos: [], quedanDeMas: 0 };

  const orden = [...activos].sort((a, b) => {
    const ta = a.lastSeenAt ? a.lastSeenAt.getTime() : -Infinity;
    const tb = b.lastSeenAt ? b.lastSeenAt.getTime() : -Infinity;
    if (ta !== tb) return ta - tb;
    return a.nombre.localeCompare(b.nombre);
  });

  let adminsActivos = activos.filter((m) => m.role === 'Admin').length;
  const elegidos: T[] = [];

  for (const candidato of orden) {
    if (elegidos.length === sobran) break;
    // Nunca el último administrador activo.
    if (candidato.role === 'Admin' && adminsActivos <= 1) continue;
    elegidos.push(candidato);
    if (candidato.role === 'Admin') adminsActivos -= 1;
  }

  return { elegidos, quedanDeMas: sobran - elegidos.length };
}
