import { Prisma } from '@prisma/client';
import { currentDb } from '../../../shared/infrastructure/prisma/unit-of-work';
import { toMoney } from '../../../shared/domain/Money';
import type { StockRepository } from '../application/ports/StockRepository';

export class PrismaStockRepository implements StockRepository {
  async decrementar(idProducto: number, cantidad: number) {
    const rows = await currentDb().$queryRaw<Array<{ id: number; nombre: string; costo: Prisma.Decimal; cantidad: number }>>(Prisma.sql`
      UPDATE productos
      SET cantidad = cantidad - ${cantidad}, updated_at = now()
      WHERE id = ${idProducto} AND activo = true AND cantidad >= ${cantidad}
      RETURNING id, nombre, costo, cantidad
    `);
    if (!rows.length) return null;
    const r = rows[0];
    return { id: r.id, nombre: r.nombre, costo: toMoney(r.costo), cantidad: r.cantidad };
  }
}
