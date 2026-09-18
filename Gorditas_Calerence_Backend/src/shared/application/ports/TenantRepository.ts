import type { PlanId, PlanStatus, TenantConfig, TenantInfo } from '../../domain/Tenant';

export interface NuevoTenant {
  slug: string;
  nombre: string;
  zitadelOrgId: string;
  zitadelProjectGrantId: string | null;
  trialEndsAt: Date;
  maxUsuarios: number;
  config: TenantConfig;
}

export interface BillingUpdate {
  plan?: PlanId;
  planStatus?: PlanStatus;
  stripeSubscriptionId?: string | null;
  maxUsuarios?: number;
  trialEndsAt?: Date | null;
}

/** Tabla de plataforma `tenants` (sin RLS). */
export interface TenantRepository {
  findById(id: string): Promise<TenantInfo | null>;
  findByOrgId(orgId: string): Promise<TenantInfo | null>;
  findBySlug(slug: string): Promise<TenantInfo | null>;
  findByStripeSubscriptionId(subscriptionId: string): Promise<TenantInfo | null>;
  findByStripeCustomerId(customerId: string): Promise<TenantInfo | null>;
  /** Id del cliente de Stripe (no viaja en TenantInfo). */
  getStripeCustomerId(id: string): Promise<string | null>;
  setStripeCustomerId(id: string, customerId: string): Promise<void>;
  create(data: NuevoTenant): Promise<TenantInfo>;
  delete(id: string): Promise<void>;
  setProvisioningStatus(id: string, status: 'pending' | 'ready' | 'failed'): Promise<void>;
  updateConfig(id: string, config: TenantConfig): Promise<TenantInfo>;
  updateBilling(id: string, data: BillingUpdate): Promise<TenantInfo>;
  /** Restaurantes activos, para los trabajos que recorren la plataforma entera. */
  listActive(): Promise<TenantInfo[]>;
  /** Marca (o limpia) desde cuándo el restaurante excede su cupo. */
  setSobreCupoDesde(id: string, desde: Date | null): Promise<void>;
}
