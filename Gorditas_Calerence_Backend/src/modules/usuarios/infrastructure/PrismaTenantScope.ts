import type { PrismaClient } from '@prisma/client';
import { runAsTenant } from '../../../shared/infrastructure/prisma/unit-of-work';
import type { TenantScope } from '../application/ports/TenantScope';

/** Fija `app.tenant_id` para operaciones que no vienen de una petición HTTP. */
export class PrismaTenantScope implements TenantScope {
  constructor(private readonly prisma: PrismaClient) {}

  run<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return runAsTenant(this.prisma, tenantId, () => fn());
  }
}
