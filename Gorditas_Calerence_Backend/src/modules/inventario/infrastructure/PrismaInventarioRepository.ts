import { Prisma, type Producto as ProductoRow } from '@prisma/client';
import { toMoney } from '../../../shared/domain/Money';
import { currentDb } from '../../../shared/infrastructure/prisma/unit-of-work';
import type { InventarioRepository, ProductoStock } from '../application/ports/InventarioRepository';

type Row = ProductoRow & { tipoProducto: { nombre: string } };
const include = { tipoProducto: { select: { nombre: true } } } as const;

export function toProductoStock(r: Row): ProductoStock {
  return {
    id: r.id,
    idTipoProducto: r.idTipoProducto,
    nombreTipoProducto: r.tipoProducto.nombre,
    nombre: r.nombre,
    cantidad: r.cantidad,
    costo: toMoney(r.costo),
    variantes: Array.isArray(r.variantes) ? (r.variantes as string[]) : [],
    activo: r.activo,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaInventarioRepository implements InventarioRepository {
  async list(filter: { idTipoProducto?: number; activo?: boolean }, page: { skip: number; take: number }) {
    const where: Prisma.ProductoWhereInput = {};
    if (filter.idTipoProducto !== undefined) where.idTipoProducto = filter.idTipoProducto;
    if (filter.activo !== undefined) where.activo = filter.activo;
    const db = currentDb();
    const [rows, total] = await Promise.all([
      db.producto.findMany({ where, orderBy: { nombre: 'asc' }, skip: page.skip, take: page.take, include }),
      db.producto.count({ where }),
    ]);
    return { rows: rows.map(toProductoStock), total };
  }

  async listAll(filter: { activo?: boolean }): Promise<ProductoStock[]> {
    const rows = await currentDb().producto.findMany({ where: filter.activo !== undefined ? { activo: filter.activo } : {}, orderBy: { cantidad: 'asc' }, include });
    return rows.map(toProductoStock);
  }

  async incrementar(idProducto: number, cantidad: number): Promise<ProductoStock | null> {
    try {
      const row = await currentDb().producto.update({ where: { id: idProducto }, data: { cantidad: { increment: cantidad } }, include });
      return toProductoStock(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return null;
      throw err;
    }
  }

  async setCantidad(idProducto: number, cantidad: number): Promise<ProductoStock | null> {
    try {
      const row = await currentDb().producto.update({ where: { id: idProducto }, data: { cantidad }, include });
      return toProductoStock(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return null;
      throw err;
    }
  }
}
