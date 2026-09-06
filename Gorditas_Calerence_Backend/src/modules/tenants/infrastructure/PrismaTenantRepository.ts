import type { PrismaClient, Tenant as TenantRow } from '@prisma/client';
import type { TenantConfig, TenantInfo } from '../../../shared/domain/Tenant';
import type { TenantRepository } from '../application/ports/TenantRepository';

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

  async updateConfig(id: string, config: TenantConfig): Promise<TenantInfo> {
    const row = await this.prisma.tenant.update({ where: { id }, data: { config: config as object } });
    return toTenantInfo(row);
  }
}
