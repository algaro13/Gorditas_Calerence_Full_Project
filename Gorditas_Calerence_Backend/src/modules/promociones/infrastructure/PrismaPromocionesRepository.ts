import { toMoney } from '../../../shared/domain/Money';
import { currentDb } from '../../../shared/infrastructure/prisma/unit-of-work';
import type { LineaEvaluable } from '../domain/evaluar';
import type { NuevaPromocion, PromocionesRepository, PromocionRow } from '../application/ports/PromocionesRepository';

type Fila = Awaited<ReturnType<typeof leerUna>>;

async function leerUna(id: number) {
  return currentDb().promocion.findUnique({ where: { id }, include: { items: true } });
}

function aFila(p: NonNullable<Fila>): PromocionRow {
  return {
    id: p.id,
    nombre: p.nombre,
    forma: p.forma,
    activo: p.activo,
    combinable: p.combinable,
    precio: p.precio === null ? null : toMoney(p.precio),
    lleva: p.lleva,
    paga: p.paga,
    porcentaje: p.porcentaje === null ? null : Number(p.porcentaje.toString()),
    idTipoPlatillo: p.idTipoPlatillo,
    items: p.items.map((i) => ({ idPlatillo: i.idPlatillo, idProducto: i.idProducto, cantidad: i.cantidad })),
    desde: p.desde,
    hasta: p.hasta,
    diasSemana: p.diasSemana,
    horaInicio: p.horaInicio,
    horaFin: p.horaFin,
    createdAt: p.createdAt,
  };
}

/** Los campos de la promoción, sin sus artículos, que van en su propia tabla. */
function campos(data: NuevaPromocion) {
  return {
    nombre: data.nombre.trim(),
    forma: data.forma,
    activo: data.activo ?? true,
    combinable: data.combinable ?? false,
    precio: data.precio ?? null,
    lleva: data.lleva ?? null,
    paga: data.paga ?? null,
    porcentaje: data.porcentaje ?? null,
    idTipoPlatillo: data.idTipoPlatillo ?? null,
    desde: data.desde ?? null,
    hasta: data.hasta ?? null,
    diasSemana: data.diasSemana ?? [],
    horaInicio: data.horaInicio ?? null,
    horaFin: data.horaFin ?? null,
  };
}

export class PrismaPromocionesRepository implements PromocionesRepository {
  async list(soloActivas: boolean): Promise<PromocionRow[]> {
    const rows = await currentDb().promocion.findMany({
      where: soloActivas ? { activo: true } : {},
      include: { items: true },
      orderBy: { id: 'asc' },
    });
    return rows.map(aFila);
  }

  async findById(id: number): Promise<PromocionRow | null> {
    const row = await leerUna(id);
    return row ? aFila(row) : null;
  }

  async create(data: NuevaPromocion): Promise<PromocionRow> {
    const row = await currentDb().promocion.create({
      data: {
        ...campos(data),
        items: { create: (data.items ?? []).map((i) => ({ idPlatillo: i.idPlatillo ?? null, idProducto: i.idProducto ?? null, cantidad: i.cantidad })) },
      },
      include: { items: true },
    });
    return aFila(row);
  }

  async update(id: number, data: NuevaPromocion): Promise<PromocionRow | null> {
    const db = currentDb();
    if (!(await db.promocion.findUnique({ where: { id } }))) return null;
    // Los artículos se reemplazan enteros: son la definición del combo, no una lista que se
    // vaya editando pieza a pieza.
    await db.promocionItem.deleteMany({ where: { idPromocion: id } });
    const row = await db.promocion.update({
      where: { id },
      data: {
        ...campos(data),
        items: { create: (data.items ?? []).map((i) => ({ idPlatillo: i.idPlatillo ?? null, idProducto: i.idProducto ?? null, cantidad: i.cantidad })) },
      },
      include: { items: true },
    });
    return aFila(row);
  }

  async desactivar(id: number): Promise<boolean> {
    const r = await currentDb().promocion.updateMany({ where: { id }, data: { activo: false } });
    return r.count > 0;
  }

  async lineasDe(idOrden: string): Promise<LineaEvaluable[]> {
    const db = currentDb();
    const [productos, platillos] = await Promise.all([
      db.ordenDetalleProducto.findMany({ where: { idOrden } }),
      db.ordenDetallePlatillo.findMany({
        where: { suborden: { idOrden } },
        // La categoría permite que una promoción hable de «las gorditas» sin enumerarlas.
        include: { platillo: { select: { idTipoPlatillo: true } } },
      }),
    ]);

    return [
      ...platillos.map((p) => ({
        tipo: 'platillo' as const,
        idCatalogo: p.idPlatillo,
        idTipoPlatillo: p.platillo?.idTipoPlatillo ?? null,
        cantidad: p.cantidad,
        precioUnitario: toMoney(p.costoPlatillo),
      })),
      ...productos.map((p) => ({
        tipo: 'producto' as const,
        idCatalogo: p.idProducto,
        cantidad: p.cantidad,
        precioUnitario: toMoney(p.costoProducto),
      })),
    ];
  }

  async reemplazarDescuentos(
    idOrden: string,
    descuentos: Array<{ idPromocion: number; nombre: string; importe: number }>,
  ): Promise<void> {
    const db = currentDb();
    // Se borran y se reescriben en vez de casarlos uno a uno: son derivados, no tienen identidad
    // propia y nadie guarda nada en ellos que haya que conservar.
    await db.ordenDescuento.deleteMany({ where: { idOrden } });
    if (descuentos.length === 0) return;
    await db.ordenDescuento.createMany({
      data: descuentos.map((d) => ({ idOrden, idPromocion: d.idPromocion, nombre: d.nombre, importe: d.importe })),
    });
  }
}
