import type { PrismaClient } from '@prisma/client';
import type { Bitacora } from '../application/ResumenPlataforma';

/** Usa el cliente global: `bitacora_plataforma` es tabla de plataforma y no tiene RLS. */
export class PrismaBitacora implements Bitacora {
  constructor(private readonly prisma: PrismaClient) {}

  async registrar(e: { operadorId: string; operadorEmail: string; accion: string; detalle?: Record<string, unknown> }): Promise<void> {
    await this.prisma.bitacoraPlataforma.create({
      data: { operadorId: e.operadorId, operadorEmail: e.operadorEmail, accion: e.accion, detalle: (e.detalle ?? {}) as object },
    });
  }
}
