import type { PrismaClient } from '@prisma/client';
import type { AuthInfo } from '../../../shared/domain/Auth';
import type { TenantInfo } from '../../../shared/domain/Tenant';
import { runAsTenant } from '../../../shared/infrastructure/prisma/unit-of-work';

/**
 * Espejo local de los miembros de la organización (`tenant_users`). Zitadel es la fuente
 * de verdad de identidad y roles; aquí solo se guarda nombre, correo, rol visible y última actividad.
 */
export async function touchMember(prisma: PrismaClient, tenant: TenantInfo, auth: AuthInfo, now: Date): Promise<void> {
  await runAsTenant(prisma, tenant.id, async (db) => {
    await db.tenantUser.upsert({
      where: { tenantId_zitadelUserId: { tenantId: tenant.id, zitadelUserId: auth.userId } },
      create: {
        zitadelUserId: auth.userId,
        email: auth.email || `${auth.userId}@sin-correo.local`,
        nombre: auth.name || auth.email || auth.userId,
        role: auth.primaryRole ?? 'Mesero',
        lastSeenAt: now,
      },
      update: {
        ...(auth.email ? { email: auth.email } : {}),
        ...(auth.name ? { nombre: auth.name } : {}),
        ...(auth.primaryRole ? { role: auth.primaryRole } : {}),
        lastSeenAt: now,
      },
    });
  });
}
