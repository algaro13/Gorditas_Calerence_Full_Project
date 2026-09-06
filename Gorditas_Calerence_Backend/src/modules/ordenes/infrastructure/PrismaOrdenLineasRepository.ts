import { Prisma } from '@prisma/client';
import { currentDb } from '../../../shared/infrastructure/prisma/unit-of-work';
import type { LineaKind, OrdenLineasRepository } from '../application/ports/OrdenLineasRepository';
import type { LineaExtra, LineaPlatillo, LineaProducto, Suborden } from '../domain/types';
import { toLineaExtra, toLineaPlatillo, toLineaProducto, toSuborden } from './PrismaOrdenRepository';

function isNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}

export class PrismaOrdenLineasRepository implements OrdenLineasRepository {
  async findSuborden(id: string): Promise<Suborden | null> {
    const row = await currentDb().suborden.findUnique({ where: { id } });
    return row ? toSuborden(row) : null;
  }

  async createSuborden(idOrden: string, nombre: string): Promise<Suborden> {
    return toSuborden(await currentDb().suborden.create({ data: { idOrden, nombre } }));
  }

  async createPlatillo(data: Omit<LineaPlatillo, 'id' | 'listo' | 'entregado' | 'createdAt'>): Promise<LineaPlatillo> {
    return toLineaPlatillo(await currentDb().ordenDetallePlatillo.create({ data }));
  }

  async createProducto(data: Omit<LineaProducto, 'id' | 'listo' | 'entregado' | 'createdAt'>): Promise<LineaProducto> {
    return toLineaProducto(await currentDb().ordenDetalleProducto.create({ data }));
  }

  async createExtra(data: Omit<LineaExtra, 'id' | 'listo' | 'entregado' | 'createdAt'>): Promise<LineaExtra> {
    return toLineaExtra(await currentDb().ordenDetalleExtra.create({ data }));
  }

  async findPlatillo(id: string): Promise<LineaPlatillo | null> {
    const row = await currentDb().ordenDetallePlatillo.findUnique({ where: { id } });
    return row ? toLineaPlatillo(row) : null;
  }

  async findProducto(id: string): Promise<LineaProducto | null> {
    const row = await currentDb().ordenDetalleProducto.findUnique({ where: { id } });
    return row ? toLineaProducto(row) : null;
  }

  async findExtra(id: string): Promise<LineaExtra | null> {
    const row = await currentDb().ordenDetalleExtra.findUnique({ where: { id } });
    return row ? toLineaExtra(row) : null;
  }

  async updateFlags(kind: LineaKind, id: string, data: Partial<{ listo: boolean; entregado: boolean }>): Promise<boolean> {
    const db = currentDb();
    try {
      if (kind === 'producto') await db.ordenDetalleProducto.update({ where: { id }, data });
      else if (kind === 'platillo') await db.ordenDetallePlatillo.update({ where: { id }, data });
      else await db.ordenDetalleExtra.update({ where: { id }, data });
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async updatePlatilloNotas(id: string, notas: string | null): Promise<boolean> {
    try {
      await currentDb().ordenDetallePlatillo.update({ where: { id }, data: { notas } });
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async deleteLinea(kind: LineaKind, id: string): Promise<boolean> {
    const db = currentDb();
    try {
      if (kind === 'producto') await db.ordenDetalleProducto.delete({ where: { id } });
      else if (kind === 'platillo') await db.ordenDetallePlatillo.delete({ where: { id } });
      else await db.ordenDetalleExtra.delete({ where: { id } });
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async ordenIdOf(kind: LineaKind, id: string): Promise<string | null> {
    const db = currentDb();
    if (kind === 'producto') {
      const row = await db.ordenDetalleProducto.findUnique({ where: { id }, select: { idOrden: true } });
      return row?.idOrden ?? null;
    }
    if (kind === 'platillo') {
      const row = await db.ordenDetallePlatillo.findUnique({ where: { id }, select: { suborden: { select: { idOrden: true } } } });
      return row?.suborden.idOrden ?? null;
    }
    const row = await db.ordenDetalleExtra.findUnique({
      where: { id },
      select: { detallePlatillo: { select: { suborden: { select: { idOrden: true } } } } },
    });
    return row?.detallePlatillo.suborden.idOrden ?? null;
  }
}
