import type { PrismaClient } from '@prisma/client';
import type { AuthInfo } from '../../../shared/domain/Auth';
import type { TenantInfo } from '../../../shared/domain/Tenant';
import type { UserProfile } from '../../../shared/application/ports/IdentityProvider';
import { runAsTenant } from '../../../shared/infrastructure/prisma/unit-of-work';

/** Correo de relleno para fichas creadas sin conocer la dirección real. */
const SIN_CORREO = '@sin-correo.local';
const correoDeRelleno = (userId: string) => `${userId}${SIN_CORREO}`;

/**
 * Espejo local de los miembros de la organización (`tenant_users`). Zitadel es la fuente
 * de verdad de identidad y roles; aquí solo se guarda nombre, correo, rol visible y última actividad.
 *
 * El token de acceso no lleva correo ni nombre, así que a quien se dio de alta directamente en
 * Zitadel (sin pasar por la aplicación) hay que preguntárselos al proveedor. Solo se consulta al
 * crear la ficha o cuando la existente quedó con el correo de relleno, no en cada visita.
 */
export async function touchMember(
  prisma: PrismaClient,
  tenant: TenantInfo,
  auth: AuthInfo,
  now: Date,
  buscarPerfil?: (userId: string) => Promise<UserProfile | null>,
): Promise<void> {
  await runAsTenant(prisma, tenant.id, async (db) => {
    const ficha = await db.tenantUser.findUnique({
      where: { tenantId_zitadelUserId: { tenantId: tenant.id, zitadelUserId: auth.userId } },
      select: { id: true, email: true },
    });

    let email = auth.email || null;
    let nombre = auth.name || null;
    const faltanDatos = !email || !nombre;
    const fichaIncompleta = !ficha || ficha.email.endsWith(SIN_CORREO);
    if (faltanDatos && fichaIncompleta && buscarPerfil) {
      const perfil = await buscarPerfil(auth.userId).catch(() => null);
      email = email || perfil?.email || null;
      nombre = nombre || perfil?.nombre || null;
    }

    if (!ficha) {
      await db.tenantUser.create({
        data: {
          zitadelUserId: auth.userId,
          email: email || correoDeRelleno(auth.userId),
          nombre: nombre || email || auth.userId,
          role: auth.primaryRole ?? 'Mesero',
          lastSeenAt: now,
        },
      });
      return;
    }

    await db.tenantUser.update({
      where: { id: ficha.id },
      data: {
        ...(email ? { email } : {}),
        ...(nombre ? { nombre } : {}),
        ...(auth.primaryRole ? { role: auth.primaryRole } : {}),
        lastSeenAt: now,
      },
    });
  });
}
