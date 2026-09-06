import { Prisma } from '@prisma/client';
import type { Orden as OrdenRow, OrdenDetalleExtra as ExtraRow, OrdenDetallePlatillo as PlatilloRow, OrdenDetalleProducto as ProductoRow, Suborden as SubordenRow } from '@prisma/client';
import { currentDb } from '../../../shared/infrastructure/prisma/unit-of-work';
import { toMoney } from '../../../shared/domain/Money';
import type { NuevaOrden, OrdenFilter, OrdenRepository } from '../application/ports/OrdenRepository';
import type { LineaExtra, LineaPlatillo, LineaProducto, OrdenCabecera, OrdenConDetalles, Suborden } from '../domain/types';

export function toOrden(row: OrdenRow): OrdenCabecera {
  return {
    id: row.id,
    folio: row.folio,
    idTipoOrden: row.idTipoOrden,
    nombreTipoOrden: row.nombreTipoOrden,
    estatus: row.estatus,
    idMesa: row.idMesa,
    nombreMesa: row.nombreMesa,
    nombreCliente: row.nombreCliente,
    fechaHora: row.fechaHora,
    fechaPago: row.fechaPago,
    total: toMoney(row.total),
    notas: row.notas,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const toSuborden = (r: SubordenRow): Suborden => ({ id: r.id, idOrden: r.idOrden, nombre: r.nombre, createdAt: r.createdAt });

export const toLineaPlatillo = (r: PlatilloRow): LineaPlatillo => ({
  id: r.id,
  idSuborden: r.idSuborden,
  idPlatillo: r.idPlatillo,
  nombrePlatillo: r.nombrePlatillo,
  idGuiso: r.idGuiso,
  nombreGuiso: r.nombreGuiso,
  costoPlatillo: toMoney(r.costoPlatillo),
  cantidad: r.cantidad,
  importe: toMoney(r.importe),
  notas: r.notas,
  listo: r.listo,
  entregado: r.entregado,
  createdAt: r.createdAt,
});

export const toLineaProducto = (r: ProductoRow): LineaProducto => ({
  id: r.id,
  idOrden: r.idOrden,
  idProducto: r.idProducto,
  nombreProducto: r.nombreProducto,
  costoProducto: toMoney(r.costoProducto),
  cantidad: r.cantidad,
  importe: toMoney(r.importe),
  listo: r.listo,
  entregado: r.entregado,
  createdAt: r.createdAt,
});

export const toLineaExtra = (r: ExtraRow): LineaExtra => ({
  id: r.id,
  idOrdenDetallePlatillo: r.idOrdenDetallePlatillo,
  idExtra: r.idExtra,
  nombreExtra: r.nombreExtra,
  costoExtra: toMoney(r.costoExtra),
  cantidad: r.cantidad,
  importe: toMoney(r.importe),
  listo: r.listo,
  entregado: r.entregado,
  createdAt: r.createdAt,
});

export class PrismaOrdenRepository implements OrdenRepository {
  async list(filter: OrdenFilter, page: { skip: number; take: number }) {
    const where: Prisma.OrdenWhereInput = {};
    if (filter.estatus) where.estatus = filter.estatus;
    if (filter.estatusNo?.length) where.estatus = { notIn: filter.estatusNo };
    if (filter.idMesa !== undefined) where.idMesa = filter.idMesa;
    if (filter.rango) where.fechaHora = { gte: filter.rango.from, lt: filter.rango.to };

    const db = currentDb();
    const [rows, total] = await Promise.all([
      db.orden.findMany({ where, orderBy: { fechaHora: 'desc' }, skip: page.skip, take: page.take }),
      db.orden.count({ where }),
    ]);
    return { rows: rows.map(toOrden), total };
  }

  async findById(id: string): Promise<OrdenCabecera | null> {
    const row = await currentDb().orden.findUnique({ where: { id } });
    return row ? toOrden(row) : null;
  }

  async findTree(id: string): Promise<OrdenConDetalles | null> {
    const row = await currentDb().orden.findUnique({
      where: { id },
      include: {
        subordenes: { orderBy: { createdAt: 'asc' }, include: { platillos: { orderBy: { createdAt: 'asc' }, include: { extras: { orderBy: { createdAt: 'asc' } } } } } },
        productos: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) return null;
    const platillos = row.subordenes.flatMap((s) => s.platillos.map((p) => ({ ...toLineaPlatillo(p), extras: p.extras.map(toLineaExtra) })));
    return {
      ...toOrden(row),
      subordenes: row.subordenes.map(toSuborden),
      productos: row.productos.map(toLineaProducto),
      platillos,
      extras: platillos.flatMap((p) => p.extras),
    };
  }

  async create(data: NuevaOrden): Promise<OrdenCabecera> {
    const row = await currentDb().orden.create({ data });
    return toOrden(row);
  }

  async update(id: string, data: Partial<Pick<OrdenCabecera, 'estatus' | 'fechaPago' | 'fechaHora'>>): Promise<OrdenCabecera> {
    const row = await currentDb().orden.update({ where: { id }, data });
    return toOrden(row);
  }

  async delete(id: string): Promise<void> {
    await currentDb().orden.delete({ where: { id } });
  }

  async recalcularTotal(id: string): Promise<number> {
    const rows = await currentDb().$queryRaw<Array<{ total: Prisma.Decimal }>>(Prisma.sql`
      UPDATE ordenes o SET total =
          COALESCE((SELECT SUM(dp.importe) FROM orden_detalle_productos dp WHERE dp.id_orden = o.id), 0)
        + COALESCE((SELECT SUM(p.importe) FROM orden_detalle_platillos p JOIN subordenes s ON s.id = p.id_suborden WHERE s.id_orden = o.id), 0)
        + COALESCE((SELECT SUM(e.importe) FROM orden_detalle_extras e
                    JOIN orden_detalle_platillos p ON p.id = e.id_orden_detalle_platillo
                    JOIN subordenes s ON s.id = p.id_suborden WHERE s.id_orden = o.id), 0),
        updated_at = now()
      WHERE o.id = ${id}::uuid
      RETURNING o.total
    `);
    return rows.length ? toMoney(rows[0].total) : 0;
  }

  async marcarTodoListo(id: string): Promise<void> {
    const db = currentDb();
    await db.$executeRaw(Prisma.sql`UPDATE orden_detalle_productos SET listo = true, updated_at = now() WHERE id_orden = ${id}::uuid`);
    await db.$executeRaw(Prisma.sql`
      UPDATE orden_detalle_platillos p SET listo = true, updated_at = now()
      FROM subordenes s WHERE s.id = p.id_suborden AND s.id_orden = ${id}::uuid`);
    await db.$executeRaw(Prisma.sql`
      UPDATE orden_detalle_extras e SET listo = true, updated_at = now()
      FROM orden_detalle_platillos p JOIN subordenes s ON s.id = p.id_suborden
      WHERE p.id = e.id_orden_detalle_platillo AND s.id_orden = ${id}::uuid`);
  }
}
