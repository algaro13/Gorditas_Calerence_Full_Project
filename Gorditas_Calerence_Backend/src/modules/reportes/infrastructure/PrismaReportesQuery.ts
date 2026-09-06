import { Prisma } from '@prisma/client';
import { toMoney } from '../../../shared/domain/Money';
import { currentDb } from '../../../shared/infrastructure/prisma/unit-of-work';
import { toApi } from '../../../shared/utils/serialize';
import type { GastoRow, GastosReporte, Rango, ReportesQuery, VendidoRow, VentasReporte } from '../application/ports/ReportesQuery';

/** Consultas de reportes. El corte de día se calcula en la zona horaria del negocio. */
export class PrismaReportesQuery implements ReportesQuery {
  constructor(private readonly timeZone: string) {}

  async ventas(rango: Rango | null): Promise<VentasReporte> {
    const db = currentDb();
    const tz = this.timeZone;
    const rangoSql = rango ? Prisma.sql`AND o.fecha_hora >= ${rango.from} AND o.fecha_hora < ${rango.to}` : Prisma.empty;

    const where: Prisma.OrdenWhereInput = { estatus: 'Pagada', ...(rango ? { fechaHora: { gte: rango.from, lt: rango.to } } : {}) };
    const [ordenes, ordenesPagadas, resumenRows, porDia, porTipo] = await Promise.all([
      db.orden.findMany({
        where,
        orderBy: { fechaHora: 'desc' },
        include: { productos: true, subordenes: { include: { platillos: { include: { extras: true } } } } },
      }),
      db.orden.count({ where: { estatus: 'Pagada' } }),
      db.$queryRaw<Array<{ totalVentas: number; cantidadOrdenes: number; promedioVenta: number }>>(Prisma.sql`
        SELECT COALESCE(SUM(o.total),0)::float8 AS "totalVentas", COUNT(*)::int AS "cantidadOrdenes", COALESCE(AVG(o.total),0)::float8 AS "promedioVenta"
        FROM ordenes o WHERE o.estatus = 'Pagada' ${rangoSql}`),
      db.$queryRaw<Array<{ _id: string; ventas: number; ordenes: number }>>(Prisma.sql`
        SELECT to_char(o.fecha_hora AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS "_id", COALESCE(SUM(o.total),0)::float8 AS ventas, COUNT(*)::int AS ordenes
        FROM ordenes o WHERE o.estatus = 'Pagada' ${rangoSql}
        GROUP BY 1 ORDER BY 1`),
      db.$queryRaw<Array<{ _id: string; ventas: number; ordenes: number }>>(Prisma.sql`
        SELECT o.nombre_tipo_orden AS "_id", COALESCE(SUM(o.total),0)::float8 AS ventas, COUNT(*)::int AS ordenes
        FROM ordenes o WHERE o.estatus = 'Pagada' ${rangoSql}
        GROUP BY 1 ORDER BY ventas DESC`),
    ]);

    const productos = ordenes.flatMap((o) => o.productos);
    const platillos = ordenes.flatMap((o) => o.subordenes.flatMap((s) => s.platillos));
    const extras = platillos.flatMap((p) => p.extras);
    const cabeceras = ordenes.map(({ productos: _p, subordenes: _s, ...o }) => o);

    return {
      ordenes: toApi(cabeceras),
      productos: toApi(productos),
      platillos: toApi(platillos.map(({ extras: _e, ...p }) => p)),
      extras: toApi(extras),
      total: ordenes.length,
      resumen: resumenRows[0] ?? { totalVentas: 0, cantidadOrdenes: 0, promedioVenta: 0 },
      ventasPorDia: porDia,
      ventasPorTipo: porTipo,
      ordenesPagadas,
    };
  }

  async inventario(): Promise<unknown[]> {
    const rows = await currentDb().producto.findMany({ where: { activo: true }, orderBy: { cantidad: 'asc' }, include: { tipoProducto: { select: { nombre: true } } } });
    return toApi(rows, { 'tipoProducto.nombre': 'nombreTipoProducto' });
  }

  async gastos(filter: { rango: Rango | null; idTipoGasto?: number }): Promise<GastosReporte> {
    const db = currentDb();
    const tz = this.timeZone;
    const conds: Prisma.Sql[] = [];
    if (filter.rango) conds.push(Prisma.sql`g.fecha >= ${filter.rango.from} AND g.fecha < ${filter.rango.to}`);
    if (filter.idTipoGasto !== undefined) conds.push(Prisma.sql`g.id_tipo_gasto = ${filter.idTipoGasto}`);
    const whereSql = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}` : Prisma.empty;

    const where: Prisma.GastoWhereInput = {
      ...(filter.rango ? { fecha: { gte: filter.rango.from, lt: filter.rango.to } } : {}),
      ...(filter.idTipoGasto !== undefined ? { idTipoGasto: filter.idTipoGasto } : {}),
    };
    const [rows, resumenRows, porTipo, porDia] = await Promise.all([
      db.gasto.findMany({ where, orderBy: { fecha: 'desc' }, include: { tipoGasto: { select: { nombre: true } } } }),
      db.$queryRaw<Array<{ totalGastos: number; cantidadGastos: number; promedioGasto: number }>>(Prisma.sql`
        SELECT COALESCE(SUM(g.gasto_total),0)::float8 AS "totalGastos", COUNT(*)::int AS "cantidadGastos", COALESCE(AVG(g.gasto_total),0)::float8 AS "promedioGasto"
        FROM gastos g ${whereSql}`),
      db.$queryRaw<Array<{ _id: string; gastos: number; cantidad: number }>>(Prisma.sql`
        SELECT t.nombre AS "_id", COALESCE(SUM(g.gasto_total),0)::float8 AS gastos, COUNT(*)::int AS cantidad
        FROM gastos g JOIN tipos_gasto t ON t.id = g.id_tipo_gasto ${whereSql}
        GROUP BY t.nombre ORDER BY gastos DESC`),
      db.$queryRaw<Array<{ _id: string; gastos: number; cantidad: number }>>(Prisma.sql`
        SELECT to_char(g.fecha AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS "_id", COALESCE(SUM(g.gasto_total),0)::float8 AS gastos, COUNT(*)::int AS cantidad
        FROM gastos g ${whereSql}
        GROUP BY 1 ORDER BY 1`),
    ]);

    return {
      gastos: rows.map((g) => ({
        id: g.id,
        idTipoGasto: g.idTipoGasto,
        nombreTipoGasto: g.tipoGasto.nombre,
        nombre: g.nombre,
        gastoTotal: toMoney(g.gastoTotal),
        descripcion: g.descripcion,
        fecha: g.fecha,
        createdAt: g.createdAt,
      })),
      resumen: resumenRows[0] ?? { totalGastos: 0, cantidadGastos: 0, promedioGasto: 0 },
      gastosPorTipo: porTipo,
      gastosPorDia: porDia,
    };
  }

  async crearGasto(data: { nombre: string; idTipoGasto: number; gastoTotal: number; descripcion: string; fecha: Date }): Promise<GastoRow | null> {
    const db = currentDb();
    const tipo = await db.tipoGasto.findUnique({ where: { id: data.idTipoGasto } });
    if (!tipo) return null;
    const g = await db.gasto.create({ data });
    return {
      id: g.id,
      idTipoGasto: g.idTipoGasto,
      nombreTipoGasto: tipo.nombre,
      nombre: g.nombre,
      gastoTotal: toMoney(g.gastoTotal),
      descripcion: g.descripcion,
      fecha: g.fecha,
      createdAt: g.createdAt,
    };
  }

  async eliminarGasto(id: number): Promise<boolean> {
    const r = await currentDb().gasto.deleteMany({ where: { id } });
    return r.count > 0;
  }

  async productosVendidos(rango: Rango | null, limit: number) {
    const db = currentDb();
    const rangoSql = rango ? Prisma.sql`AND o.fecha_hora >= ${rango.from} AND o.fecha_hora < ${rango.to}` : Prisma.empty;
    const [productos, platillos] = await Promise.all([
      db.$queryRaw<VendidoRow<'idProducto'>[]>(Prisma.sql`
        SELECT json_build_object('idProducto', d.id_producto, 'nombreProducto', d.nombre_producto) AS "_id",
               SUM(d.cantidad)::int AS "cantidadVendida", COALESCE(SUM(d.importe),0)::float8 AS "totalVentas", COUNT(*)::int AS "vecesVendido"
        FROM orden_detalle_productos d JOIN ordenes o ON o.id = d.id_orden
        WHERE o.estatus IN ('Entregada','Pagada') ${rangoSql}
        GROUP BY d.id_producto, d.nombre_producto
        ORDER BY "cantidadVendida" DESC LIMIT ${limit}`),
      db.$queryRaw<VendidoRow<'idPlatillo'>[]>(Prisma.sql`
        SELECT json_build_object('idPlatillo', p.id_platillo, 'nombrePlatillo', p.nombre_platillo) AS "_id",
               SUM(p.cantidad)::int AS "cantidadVendida", COALESCE(SUM(p.importe),0)::float8 AS "totalVentas", COUNT(*)::int AS "vecesVendido"
        FROM orden_detalle_platillos p JOIN subordenes s ON s.id = p.id_suborden JOIN ordenes o ON o.id = s.id_orden
        WHERE o.estatus IN ('Entregada','Pagada') ${rangoSql}
        GROUP BY p.id_platillo, p.nombre_platillo
        ORDER BY "cantidadVendida" DESC LIMIT ${limit}`),
    ]);
    return { productos, platillos };
  }
}
