import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { runAsTenant } from '../../src/shared/infrastructure/prisma/unit-of-work';

/** Cliente con el rol de runtime (pos_app, sin BYPASSRLS): es el que usa la aplicación. */
export function appPrisma(): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
}

/** Cliente con el rol migrador (dueño): útil para limpiar. FORCE RLS también le aplica. */
export function adminPrisma(): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } } });
}

export interface TestTenant {
  id: string;
  slug: string;
  orgId: string;
}

export async function createTestTenant(prisma: PrismaClient, overrides: Partial<{ slug: string; orgId: string; planStatus: 'trial' | 'active' | 'canceled'; trialEndsAt: Date | null; activo: boolean }> = {}): Promise<TestTenant> {
  const suffix = randomUUID().slice(0, 8);
  const slug = overrides.slug ?? `t-${suffix}`;
  const orgId = overrides.orgId ?? `org-${suffix}`;
  const row = await prisma.tenant.create({
    data: {
      slug,
      nombre: `Restaurante ${slug}`,
      zitadelOrgId: orgId,
      zitadelProjectGrantId: `pg-${suffix}`,
      provisioningStatus: 'ready',
      plan: 'trial',
      planStatus: overrides.planStatus ?? 'trial',
      trialEndsAt: overrides.trialEndsAt === undefined ? new Date(Date.now() + 14 * 86_400_000) : overrides.trialEndsAt,
      activo: overrides.activo ?? true,
      config: { paleta: 'orange' },
    },
  });
  return { id: row.id, slug, orgId };
}

/** Borra el tenant: el cascade limpia todas sus filas de negocio. */
export async function deleteTestTenant(prisma: PrismaClient, tenantId: string): Promise<void> {
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}

/** Crea un catálogo mínimo dentro del tenant (bajo RLS). */
export async function seedMinimal(prisma: PrismaClient, tenantId: string) {
  return runAsTenant(prisma, tenantId, async (db) => {
    const tipoProducto = await db.tipoProducto.create({ data: { nombre: 'Bebidas' } });
    const producto = await db.producto.create({ data: { nombre: 'Agua', idTipoProducto: tipoProducto.id, cantidad: 10, costo: 15 } });
    const tipoOrden = await db.tipoOrden.create({ data: { nombre: 'En mesa' } });
    const mesa = await db.mesa.create({ data: { nombre: 'Mesa 1' } });
    return { tipoProducto, producto, tipoOrden, mesa };
  });
}
