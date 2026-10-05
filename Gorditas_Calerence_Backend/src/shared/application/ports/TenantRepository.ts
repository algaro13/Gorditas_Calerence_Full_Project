import type { PlanId, PlanStatus, TenantConfig, TenantInfo } from '../../domain/Tenant';

export interface NuevoTenant {
  slug: string;
  nombre: string;
  zitadelOrgId: string;
  zitadelProjectGrantId: string | null;
  trialEndsAt: Date;
  maxUsuarios: number;
  config: TenantConfig;
  /** Qué versión del aviso de privacidad y de los términos se aceptó al registrarse, y quién. */
  aceptacionLegal?: { version: string; at: Date; email: string };
}

export interface BillingUpdate {
  plan?: PlanId;
  planStatus?: PlanStatus;
  stripeSubscriptionId?: string | null;
  maxUsuarios?: number;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAt?: Date | null;
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
  /** Id de la suscripción de Stripe (no viaja en TenantInfo). */
  getStripeSubscriptionId(id: string): Promise<string | null>;
  create(data: NuevoTenant): Promise<TenantInfo>;
  delete(id: string): Promise<void>;
  setProvisioningStatus(id: string, status: 'pending' | 'ready' | 'failed'): Promise<void>;
  updateConfig(id: string, config: TenantConfig): Promise<TenantInfo>;
  updateBilling(id: string, data: BillingUpdate): Promise<TenantInfo>;
  /** Restaurantes activos, para los trabajos que recorren la plataforma entera. */
  listActive(): Promise<TenantInfo[]>;
  /** Archiva (fecha) o recupera (null) un restaurante. */
  setArchivado(id: string, at: Date | null): Promise<TenantInfo>;
  /** Excluye (o vuelve a incluir) un restaurante del ciclo de avisos y archivado. */
  setRetencionPausada(id: string, pausada: boolean): Promise<void>;
  /** Marca (o limpia) desde cuándo el restaurante excede su cupo. */
  setSobreCupoDesde(id: string, desde: Date | null): Promise<void>;
}
