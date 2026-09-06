import type { TenantConfig, TenantInfo } from '../../../../shared/domain/Tenant';

/** Tabla de plataforma `tenants` (sin RLS). */
export interface TenantRepository {
  findById(id: string): Promise<TenantInfo | null>;
  findByOrgId(orgId: string): Promise<TenantInfo | null>;
  findBySlug(slug: string): Promise<TenantInfo | null>;
  updateConfig(id: string, config: TenantConfig): Promise<TenantInfo>;
}
