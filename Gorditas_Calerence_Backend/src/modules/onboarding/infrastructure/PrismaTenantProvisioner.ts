import type { PrismaClient } from '@prisma/client';
import { runAsTenant } from '../../../shared/infrastructure/prisma/unit-of-work';
import type { ProvisionInput, TenantProvisioner } from '../application/ports/TenantProvisioner';
import { seedTenant } from './seed-tenant';

export class PrismaTenantProvisioner implements TenantProvisioner {
  constructor(private readonly prisma: PrismaClient) {}

  provision(input: ProvisionInput): Promise<void> {
    return runAsTenant(this.prisma, input.tenantId, async (db) => {
      await seedTenant(db, { mesas: input.mesas, platillos: input.platillos, guisos: input.guisos });
      await db.tenantUser.create({
        data: { zitadelUserId: input.admin.zitadelUserId, email: input.admin.email, nombre: input.admin.nombre, role: 'Admin' },
      });
    });
  }
}
