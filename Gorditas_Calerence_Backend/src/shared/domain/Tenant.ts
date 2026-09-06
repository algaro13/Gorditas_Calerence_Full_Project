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
  maxUsuarios: number;
  config: TenantConfig;
  activo: boolean;
}

export const PLAN_LIMITS: Record<Exclude<PlanId, 'trial'>, { maxUsuarios: number; precioMxn: number }> = {
  basico: { maxUsuarios: 3, precioMxn: 299 },
  profesional: { maxUsuarios: 10, precioMxn: 599 },
  empresarial: { maxUsuarios: 999, precioMxn: 999 },
};

export const TRIAL_DAYS = 14;
export const TRIAL_MAX_USUARIOS = 3;

/** Regla de acceso por plan. Devuelve null si puede operar, o el código de bloqueo. */
export function accessBlockReason(t: Pick<TenantInfo, 'planStatus' | 'trialEndsAt'>, now: Date): 'TRIAL_EXPIRED' | 'SUBSCRIPTION_INACTIVE' | null {
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
