import { currentDb } from '../../../shared/infrastructure/prisma/unit-of-work';
import { toMoney } from '../../../shared/domain/Money';
import type { CatalogoLookup } from '../application/ports/CatalogoLookup';
import type { CatalogoItem } from '../domain/types';

export class PrismaCatalogoLookup implements CatalogoLookup {
  async platillo(id: number): Promise<CatalogoItem | null> {
    const r = await currentDb().platillo.findUnique({ where: { id }, select: { id: true, nombre: true, activo: true, precio: true } });
    return r ? { id: r.id, nombre: r.nombre, activo: r.activo, precio: toMoney(r.precio) } : null;
  }

  async guiso(id: number): Promise<CatalogoItem | null> {
    const r = await currentDb().guiso.findUnique({ where: { id }, select: { id: true, nombre: true, activo: true } });
    return r ? { id: r.id, nombre: r.nombre, activo: r.activo, precio: 0 } : null;
  }

  async producto(id: number): Promise<CatalogoItem | null> {
    const r = await currentDb().producto.findUnique({ where: { id }, select: { id: true, nombre: true, activo: true, costo: true } });
    return r ? { id: r.id, nombre: r.nombre, activo: r.activo, precio: toMoney(r.costo) } : null;
  }

  async extra(id: number): Promise<CatalogoItem | null> {
    const r = await currentDb().extra.findUnique({ where: { id }, select: { id: true, nombre: true, activo: true, costo: true } });
    return r ? { id: r.id, nombre: r.nombre, activo: r.activo, precio: toMoney(r.costo) } : null;
  }

  async mesa(id: number): Promise<CatalogoItem | null> {
    const r = await currentDb().mesa.findUnique({ where: { id }, select: { id: true, nombre: true, activo: true } });
    return r ? { id: r.id, nombre: r.nombre, activo: r.activo, precio: 0 } : null;
  }

  async tipoOrden(id: number): Promise<CatalogoItem | null> {
    const r = await currentDb().tipoOrden.findUnique({ where: { id }, select: { id: true, nombre: true, activo: true } });
    return r ? { id: r.id, nombre: r.nombre, activo: r.activo, precio: 0 } : null;
  }
}
