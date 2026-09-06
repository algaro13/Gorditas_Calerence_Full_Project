import { PLAN_LIMITS, type PlanId, type PlanStatus } from '../../../shared/domain/Tenant';

export type PaidPlanId = Exclude<PlanId, 'trial'>;
export const PAID_PLANS: PaidPlanId[] = ['basico', 'profesional', 'empresarial'];

export interface PlanCatalogEntry {
  id: PaidPlanId;
  name: string;
  price: number;
  currency: 'MXN';
  maxUsuarios: number;
  features: string[];
}

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  { id: 'basico', name: 'Básico', price: PLAN_LIMITS.basico.precioMxn, currency: 'MXN', maxUsuarios: PLAN_LIMITS.basico.maxUsuarios, features: ['Órdenes', 'Cobro', 'Inventario básico'] },
  {
    id: 'profesional',
    name: 'Profesional',
    price: PLAN_LIMITS.profesional.precioMxn,
    currency: 'MXN',
    maxUsuarios: PLAN_LIMITS.profesional.maxUsuarios,
    features: ['Todo en Básico', 'Reportes', 'Múltiples mesas', 'Extras'],
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    price: PLAN_LIMITS.empresarial.precioMxn,
    currency: 'MXN',
    maxUsuarios: PLAN_LIMITS.empresarial.maxUsuarios,
    features: ['Todo en Profesional', 'Usuarios ilimitados', 'Múltiples sucursales', 'Soporte prioritario'],
  },
];

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return typeof value === 'string' && (PAID_PLANS as string[]).includes(value);
}

/** Mapa price.id de Stripe → plan. Se construye desde STRIPE_PRICE_*. */
export type PriceToPlan = Record<string, PaidPlanId>;

export function planFromPriceId(map: PriceToPlan, priceId: string | null): PaidPlanId | null {
  return priceId ? (map[priceId] ?? null) : null;
}

/** Estado de Stripe → estado interno. */
export function planStatusFromStripe(status: string): PlanStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'incomplete':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
    case 'paused':
      return 'canceled';
    default:
      return 'past_due';
  }
}
