export type PlanId = 'trial' | 'basico' | 'profesional' | 'empresarial';
export type PlanStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface TenantConfig {
  paleta?: string;
  imagen?: string | null;
  logo?: string | null;
}

/** Vista del tenant que viaja por el request (sin secretos de Stripe). */
export interface TenantInfo {
  id: string;
  slug: string;
  nombre: string;
  zitadelOrgId: string | null;
  zitadelProjectGrantId: string | null;
  plan: PlanId;
  planStatus: PlanStatus;
  trialEndsAt: Date | null;
  /** Fin del periodo pagado de la suscripción; null en prueba. */
  currentPeriodEnd: Date | null;
  /** Cuándo termina una suscripción con cancelación programada; null si no hay. */
  cancelAt: Date | null;
  /** Archivado por inactividad: bloqueado con sus datos. Null si está en uso. */
  archivadoAt: Date | null;
  maxUsuarios: number;
  /** Desde cuándo excede su cupo. Null si cabe. Arranca el plazo de `DIAS_SOBRE_CUPO`. */
  sobreCupoDesde: Date | null;
  config: TenantConfig;
  activo: boolean;
}

/**
 * Cupo que significa «sin límite». Se guarda como número porque `max_usuarios` es una columna
 * entera y el cupo se compara siempre igual; las pantallas no lo adivinan: reciben
 * `usuariosIlimitados`.
 */
export const USUARIOS_ILIMITADOS = 999;

export const PLAN_LIMITS: Record<Exclude<PlanId, 'trial'>, { maxUsuarios: number; precioMxn: number }> = {
  basico: { maxUsuarios: 3, precioMxn: 299 },
  profesional: { maxUsuarios: 10, precioMxn: 599 },
  empresarial: { maxUsuarios: USUARIOS_ILIMITADOS, precioMxn: 999 },
};

export const TRIAL_DAYS = 14;
export const TRIAL_MAX_USUARIOS = 3;

/**
 * Días que tiene un restaurante para ajustarse cuando excede su cupo, antes de que el sistema
 * desactive a los que sobran. Bajar de plan no expulsa a nadie en el momento: dejar a un mesero
 * fuera un lunes por la mañana es peor que cobrar de menos unos días.
 */
export const DIAS_SOBRE_CUPO = 15;

/** Fecha en que vence el plazo, o null si el restaurante no está excedido. */
export function fechaLimiteDeCupo(sobreCupoDesde: Date | null): Date | null {
  if (!sobreCupoDesde) return null;
  return new Date(sobreCupoDesde.getTime() + DIAS_SOBRE_CUPO * 86_400_000);
}

/** Días que un restaurante archivado puede recuperarse antes de que el operador apruebe borrarlo. */
export const DIAS_PARA_RECUPERAR = 30;

export type MotivoBloqueo = 'TRIAL_EXPIRED' | 'SUBSCRIPTION_INACTIVE' | 'RESTAURANTE_ARCHIVADO';

/**
 * Regla de acceso. Devuelve null si puede operar, o el código de bloqueo. El archivado manda sobre
 * el plan: un restaurante archivado no opera aunque su plan lo permitiera.
 */
export function accessBlockReason(t: Pick<TenantInfo, 'planStatus' | 'trialEndsAt'> & { archivadoAt?: Date | null }, now: Date): MotivoBloqueo | null {
  if (t.archivadoAt) return 'RESTAURANTE_ARCHIVADO';
  switch (t.planStatus) {
    case 'active':
    case 'past_due':
      return null;
    case 'trial':
      return t.trialEndsAt === null || t.trialEndsAt.getTime() > now.getTime() ? null : 'TRIAL_EXPIRED';
    case 'canceled':
    case 'expired':
    default:
      return 'SUBSCRIPTION_INACTIVE';
  }
}

/** Paletas de color disponibles para el branding del tenant. */
export const PALETAS = ['orange', 'red', 'green', 'blue', 'purple', 'brown', 'dark'] as const;
export type Paleta = (typeof PALETAS)[number];
