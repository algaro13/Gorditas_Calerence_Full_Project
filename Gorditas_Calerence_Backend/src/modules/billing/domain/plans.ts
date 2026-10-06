import { PLAN_LIMITS, USUARIOS_ILIMITADOS, type PlanId, type PlanStatus } from '../../../shared/domain/Tenant';

export type PaidPlanId = Exclude<PlanId, 'trial'>;
export const PAID_PLANS: PaidPlanId[] = ['basico', 'profesional', 'empresarial'];

export interface PlanCatalogEntry {
  id: PaidPlanId;
  name: string;
  /** Precio mensual. */
  price: number;
  currency: 'MXN';
  maxUsuarios: number;
  usuariosIlimitados: boolean;
  /** El que se destaca en las pantallas. */
  popular: boolean;
  features: string[];
}

function entrada(id: PaidPlanId, name: string, popular: boolean, features: string[]): PlanCatalogEntry {
  const { precioMxn, maxUsuarios } = PLAN_LIMITS[id];
  return { id, name, price: precioMxn, currency: 'MXN', maxUsuarios, usuariosIlimitados: maxUsuarios >= USUARIOS_ILIMITADOS, popular, features };
}

/**
 * El catálogo de planes: la única fuente de precios, cupos y características.
 *
 * Lo sirve `GET /api/billing/plans`, y de ahí lo leen la pantalla de planes y la landing. Antes
 * cada una tenía su copia —tres listas distintas por plan— y prometían por plan cosas que están
 * en todos (reportes, mesas, Excel, logo y colores) y dos que no existen (sucursales y un
 * «dashboard avanzado»). Lo único que cambia de un plan a otro es el número de usuarios; lo que
 * está en todos se dice una vez, en Básico. Sin niveles de soporte: no se prometen en los planes.
 */
export const PLAN_CATALOG: PlanCatalogEntry[] = [
  entrada('basico', 'Básico', false, [
    'Órdenes y cocina',
    'Cobro y caja',
    'Inventario y reportes (con Excel)',
    'Tu logo y colores',
  ]),
  entrada('profesional', 'Profesional', true, ['Todo lo de Básico', 'Para equipos medianos']),
  entrada('empresarial', 'Empresarial', false, ['Todo lo de Profesional', 'Sin límite de personal']),
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
