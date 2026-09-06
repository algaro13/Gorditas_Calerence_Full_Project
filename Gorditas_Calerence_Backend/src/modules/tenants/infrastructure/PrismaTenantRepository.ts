import type { PrismaClient, Tenant as TenantRow } from '@prisma/client';
import type { TenantConfig, TenantInfo } from '../../../shared/domain/Tenant';
import type { BillingUpdate, NuevoTenant, TenantRepository } from '../../../shared/application/ports/TenantRepository';

export function toTenantInfo(row: TenantRow): TenantInfo {
  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    zitadelOrgId: row.zitadelOrgId,
    zitadelProjectGrantId: row.zitadelProjectGrantId,
    plan: row.plan,
    planStatus: row.planStatus,
    trialEndsAt: row.trialEndsAt,
    maxUsuarios: row.maxUsuarios,
    config: (row.config ?? {}) as TenantConfig,
    activo: row.activo,
  };
}

/** Usa el cliente global: `tenants` es tabla de plataforma y no tiene RLS. */
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<TenantInfo | null> {
    const row = await this.prisma.tenant.findUnique({ where: { id } });
    return row ? toTenantInfo(row) : null;
  }

  async findByOrgId(orgId: string): Promise<TenantInfo | null> {
    const row = await this.prisma.tenant.findUnique({ where: { zitadelOrgId: orgId } });
    return row ? toTenantInfo(row) : null;
  }

  async findBySlug(slug: string): Promise<TenantInfo | null> {
    const row = await this.prisma.tenant.findUnique({ where: { slug } });
    return row ? toTenantInfo(row) : null;
  }

  async findByStripeSubscriptionId(subscriptionId: string): Promise<TenantInfo | null> {
    const row = await this.prisma.tenant.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
    return row ? toTenantInfo(row) : null;
  }

  async findByStripeCustomerId(customerId: string): Promise<TenantInfo | null> {
    const row = await this.prisma.tenant.findUnique({ where: { stripeCustomerId: customerId } });
    return row ? toTenantInfo(row) : null;
  }

  async getStripeCustomerId(id: string): Promise<string | null> {
    const row = await this.prisma.tenant.findUnique({ where: { id }, select: { stripeCustomerId: true } });
    return row?.stripeCustomerId ?? null;
  }

  async setStripeCustomerId(id: string, customerId: string): Promise<void> {
    await this.prisma.tenant.update({ where: { id }, data: { stripeCustomerId: customerId } });
  }

  async create(data: NuevoTenant): Promise<TenantInfo> {
    const row = await this.prisma.tenant.create({
      data: {
        slug: data.slug,
        nombre: data.nombre,
        zitadelOrgId: data.zitadelOrgId,
        zitadelProjectGrantId: data.zitadelProjectGrantId,
        provisioningStatus: 'pending',
        plan: 'trial',
        planStatus: 'trial',
        trialEndsAt: data.trialEndsAt,
        maxUsuarios: data.maxUsuarios,
        config: data.config as object,
      },
    });
    return toTenantInfo(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tenant.deleteMany({ where: { id } });
  }

  async setProvisioningStatus(id: string, status: 'pending' | 'ready' | 'failed'): Promise<void> {
    await this.prisma.tenant.update({ where: { id }, data: { provisioningStatus: status } });
  }

  async updateConfig(id: string, config: TenantConfig): Promise<TenantInfo> {
    const row = await this.prisma.tenant.update({ where: { id }, data: { config: config as object } });
    return toTenantInfo(row);
  }

  async updateBilling(id: string, data: BillingUpdate): Promise<TenantInfo> {
    const row = await this.prisma.tenant.update({ where: { id }, data });
    return toTenantInfo(row);
  }
}
