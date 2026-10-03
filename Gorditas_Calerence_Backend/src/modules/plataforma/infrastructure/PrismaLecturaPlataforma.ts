import type { PrismaClient } from '@prisma/client';
import { runAsTenant } from '../../../shared/infrastructure/prisma/unit-of-work';
import type { DatosRestaurante } from '../domain/resumen';

const UN_DIA = 86_400_000;

/**
 * Lee, de cada restaurante, lo que la consola necesita.
 *
 * `tenants` es tabla de plataforma, pero el personal y las órdenes tienen RLS: el rol de la
 * aplicación no puede leerlos sin el contexto de un restaurante. Se recorre uno por uno con el
 * mismo contrato que usa el resto del sistema (`runAsTenant`), en lugar de darle a la aplicación
 * un rol que salte el aislamiento. Son cuatro consultas por restaurante: suficiente para cientos;
 * si un día son miles, se pasa a una vista agregada.
 */
export class PrismaLecturaPlataforma {
  constructor(private readonly prisma: PrismaClient) {}

  async restaurantes(ahora: Date): Promise<DatosRestaurante[]> {
    const tenants = await this.prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } });
    const hace30 = new Date(ahora.getTime() - 30 * UN_DIA);
    const salida: DatosRestaurante[] = [];

    for (const t of tenants) {
      // En serie dentro de la transacción: un cliente transaccional no admite consultas en paralelo.
      const uso = await runAsTenant(this.prisma, t.id, async (db) => {
        const usuariosActivos = await db.tenantUser.count({ where: { activo: true } });
        const acceso = await db.tenantUser.aggregate({ _max: { lastSeenAt: true } });
        const orden = await db.orden.aggregate({ _max: { fechaHora: true } });
        const ordenes30d = await db.orden.count({ where: { fechaHora: { gte: hace30 } } });
        return { usuariosActivos, ultimoAcceso: acceso._max.lastSeenAt, ultimaOrden: orden._max.fechaHora, ordenes30d };
      });

      salida.push({
        id: t.id,
        slug: t.slug,
        nombre: t.nombre,
        plan: t.plan,
        planStatus: t.planStatus,
        creadoEl: t.createdAt,
        trialEndsAt: t.trialEndsAt,
        currentPeriodEnd: t.currentPeriodEnd,
        cancelAt: t.cancelAt,
        tieneSuscripcionStripe: t.stripeSubscriptionId !== null,
        activo: t.activo,
        ...uso,
      });
    }
    return salida;
  }
}
