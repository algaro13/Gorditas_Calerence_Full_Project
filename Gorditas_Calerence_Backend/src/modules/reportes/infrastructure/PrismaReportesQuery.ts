import { Prisma } from '@prisma/client';
import { toMoney } from '../../../shared/domain/Money';
import { currentDb } from '../../../shared/infrastructure/prisma/unit-of-work';
import { toApi } from '../../../shared/utils/serialize';
import type { CajaRow, GastoRow, GastosReporte, Rango, ReportesQuery, VendidoRow, VentasReporte } from '../application/ports/ReportesQuery';

/**
 * Una columna DATE de Postgres llega como un `Date` a medianoche UTC; su clave de dia es
 * exactamente su parte de fecha en UTC, sin convertir a ninguna zona. Convertirla seria el
 * error clasico: en Mexico la restaria seis horas y devolveria el dia anterior.
 */
const claveDeDia = (d: Date): string => d.toISOString().slice(0, 10);

/** El dia, a medianoche UTC, que es como se guarda una columna DATE. */
const soloFecha = (d: Date): Date => new Date(`${claveDeDia(d)}T00:00:00Z`);

/** Consultas de reportes. El corte de día se calcula en la zona horaria del negocio. */
export class PrismaReportesQuery implements ReportesQuery {
  constructor(private readonly timeZone: string) {}

  async ventas(rango: Rango | null): Promise<VentasReporte> {
    const db = currentDb();
    const tz = this.timeZone;
    const rangoSql = rango ? Prisma.sql`AND o.fecha_hora >= ${rango.from} AND o.fecha_hora < ${rango.to}` : Prisma.empty;
    // El mismo filtro, para las consultas que unen descuentos con sus órdenes bajo otro alias.
    const rangoDesc = rango ? Prisma.sql`AND o.fecha_hora >= ${rango.from} AND o.fecha_hora < ${rango.to}` : Prisma.empty;

    const where: Prisma.OrdenWhereInput = { estatus: 'Pagada', ...(rango ? { fechaHora: { gte: rango.from, lt: rango.to } } : {}) };
    const [ordenes, ordenesPagadas, resumenRows, descuentoRows, porPromocion, porDia, porTipo] = await Promise.all([
      db.orden.findMany({
        where,
        orderBy: { fechaHora: 'desc' },
        include: {
          productos: true,
          subordenes: { include: { platillos: { include: { extras: true } } } },
          descuentos: { orderBy: { createdAt: 'asc' } },
        },
      }),
      db.orden.count({ where: { estatus: 'Pagada' } }),
      db.$queryRaw<Array<{ totalVentas: number; cantidadOrdenes: number; promedioVenta: number }>>(Prisma.sql`
        SELECT COALESCE(SUM(o.total),0)::float8 AS "totalVentas", COUNT(*)::int AS "cantidadOrdenes", COALESCE(AVG(o.total),0)::float8 AS "promedioVenta"
        FROM ordenes o WHERE o.estatus = 'Pagada' ${rangoSql}`),
      // Lo que se regaló, en total y por promoción. `importe` es negativo, así que se invierte
      // aquí para que el reporte hable de cuánto se descontó y no de cuánto se restó.
      db.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COALESCE(-SUM(d.importe),0)::float8 AS total
        FROM orden_descuentos d JOIN ordenes o ON o.id = d.id_orden
        WHERE o.estatus = 'Pagada' ${rangoDesc}`),
      db.$queryRaw<Array<{ _id: string; descuento: number; ordenes: number }>>(Prisma.sql`
        SELECT d.nombre AS "_id", COALESCE(-SUM(d.importe),0)::float8 AS descuento, COUNT(DISTINCT d.id_orden)::int AS ordenes
        FROM orden_descuentos d JOIN ordenes o ON o.id = d.id_orden
        WHERE o.estatus = 'Pagada' ${rangoDesc}
        GROUP BY d.nombre ORDER BY descuento DESC`),
      db.$queryRaw<Array<{ _id: string; ventas: number; descuentos: number; ordenes: number }>>(Prisma.sql`
        SELECT to_char(o.fecha_hora AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS "_id",
               COALESCE(SUM(o.total),0)::float8 AS ventas,
               COALESCE(-SUM((SELECT COALESCE(SUM(d.importe),0) FROM orden_descuentos d WHERE d.id_orden = o.id)),0)::float8 AS descuentos,
               COUNT(*)::int AS ordenes
        FROM ordenes o WHERE o.estatus = 'Pagada' ${rangoSql}
        GROUP BY 1 ORDER BY 1`),
      db.$queryRaw<Array<{ _id: string; ventas: number; ordenes: number }>>(Prisma.sql`
        SELECT o.nombre_tipo_orden AS "_id", COALESCE(SUM(o.total),0)::float8 AS ventas, COUNT(*)::int AS ordenes
        FROM ordenes o WHERE o.estatus = 'Pagada' ${rangoSql}
        GROUP BY 1 ORDER BY ventas DESC`),
    ]);

    const productos = ordenes.flatMap((o) => o.productos);
    // Un platillo se guarda contra su suborden, y la suborden es quien sabe de que orden es.
    // Al aplanar, esa suborden desaparece: si no se lleva el `idOrden` consigo, el vinculo se
    // pierde y quien lea la respuesta no puede saber en que orden se vendio el platillo.
    const platillos = ordenes.flatMap((o) => o.subordenes.flatMap((s) => s.platillos.map((p) => ({ ...p, idOrden: o.id }))));
    const extras = platillos.flatMap((p) => p.extras);
    // Sin ellos, el detalle de una orden con promoción no cuadra: sus artículos suman más que
    // lo que se cobró, y no hay forma de saber por qué.
    const descuentos = ordenes.flatMap((o) => o.descuentos);
    const cabeceras = ordenes.map(({ productos: _p, subordenes: _s, descuentos: _d, ...o }) => o);

    return {
      ordenes: toApi(cabeceras),
      productos: toApi(productos),
      platillos: toApi(platillos.map(({ extras: _e, ...p }) => p)),
      extras: toApi(extras),
      descuentos: toApi(descuentos),
      total: ordenes.length,
      resumen: {
        ...(resumenRows[0] ?? { totalVentas: 0, cantidadOrdenes: 0, promedioVenta: 0 }),
        totalDescuentos: descuentoRows[0]?.total ?? 0,
        // El bruto no se guarda: es lo cobrado más lo que se regaló.
        totalBruto: (resumenRows[0]?.totalVentas ?? 0) + (descuentoRows[0]?.total ?? 0),
      },
      ventasPorDia: porDia.map((d) => ({ ...d, bruto: d.ventas + d.descuentos })),
      descuentosPorPromocion: porPromocion,
      ventasPorTipo: porTipo,
      ordenesPagadas,
    };
  }

  /**
   * El dinero en caja de cada dia del periodo.
   *
   * La columna es DATE, asi que no hay zona que interpretar: el dia ya viene resuelto por quien
   * lo escribio. Por eso el filtro compara texto `YYYY-MM-DD` y no instantes, que es lo que hace
   * `dayRange` para las tablas con hora.
   */
  async caja(rango: Rango | null): Promise<CajaRow[]> {
    const where = rango
      ? { fecha: { gte: soloFecha(rango.from), lt: soloFecha(rango.to) } }
      : {};
    const rows = await currentDb().cajaDiaria.findMany({ where, orderBy: { fecha: 'asc' } });
    return rows.map((r) => ({ fecha: claveDeDia(r.fecha), monto: toMoney(r.monto) }));
  }

  async fijarCaja(fecha: string, monto: number): Promise<CajaRow> {
    const dia = new Date(`${fecha}T00:00:00Z`);
    const db = currentDb();
    // Se busca y luego se escribe, en vez de `upsert`, porque la llave unica incluye el
    // `tenant_id` y la aplicacion no lo conoce: lo pone la base con `current_tenant_id()`, que
    // es el mismo valor con el que la politica filtra. Esta lectura ya viene aislada, y todo
    // ocurre dentro de la transaccion de la unidad de trabajo.
    const existente = await db.cajaDiaria.findFirst({ where: { fecha: dia } });
    const row = existente
      ? await db.cajaDiaria.update({ where: { id: existente.id }, data: { monto } })
      : await db.cajaDiaria.create({ data: { fecha: dia, monto } });
    return { fecha: claveDeDia(row.fecha), monto: toMoney(row.monto) };
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
