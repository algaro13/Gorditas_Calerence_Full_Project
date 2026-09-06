import { Prisma } from '@prisma/client';
import { ConflictError } from '../../../shared/domain/DomainError';
import { currentDb } from '../../../shared/infrastructure/prisma/unit-of-work';
import type { CatalogoListFilter, CatalogoRepository, CatalogoRow } from '../application/ports/CatalogoRepository';
import type { CatalogoDef } from '../domain/registry';

/** Superficie mínima común a todos los delegates de catálogo. */
interface Delegate {
  findMany(args: Record<string, unknown>): Promise<CatalogoRow[]>;
  count(args: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<CatalogoRow>;
  update(args: Record<string, unknown>): Promise<CatalogoRow>;
  delete(args: Record<string, unknown>): Promise<CatalogoRow>;
}

function delegateOf(def: CatalogoDef): Delegate {
  return (currentDb() as unknown as Record<string, Delegate>)[def.modelo];
}

export class PrismaCatalogoRepository implements CatalogoRepository {
  async list(def: CatalogoDef, filter: CatalogoListFilter, page: { skip: number; take: number }) {
    const where: Record<string, unknown> = {};
    if (filter.activo !== undefined) where.activo = filter.activo;
    if (filter.search) {
      where.OR = def.searchable.map((f) => ({ [f]: { contains: filter.search, mode: 'insensitive' } }));
    }
    const d = delegateOf(def);
    const [rows, total] = await Promise.all([
      d.findMany({ where, orderBy: { [def.orderBy]: def.orderBy === 'fecha' ? 'desc' : 'asc' }, skip: page.skip, take: page.take, include: def.include }),
      d.count({ where }),
    ]);
    return { rows, total };
  }

  async create(def: CatalogoDef, data: Record<string, unknown>): Promise<CatalogoRow> {
    return delegateOf(def).create({ data, include: def.include });
  }

  async update(def: CatalogoDef, id: number, data: Record<string, unknown>): Promise<CatalogoRow | null> {
    try {
      return await delegateOf(def).update({ where: { id }, data, include: def.include });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return null;
      throw err;
    }
  }

  async delete(def: CatalogoDef, id: number): Promise<boolean> {
    try {
      await delegateOf(def).delete({ where: { id } });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') return false;
        if (err.code === 'P2003') throw new ConflictError('No se puede eliminar: tiene registros asociados', 'REGISTRO_REFERENCIADO');
      }
      throw err;
    }
  }
}
