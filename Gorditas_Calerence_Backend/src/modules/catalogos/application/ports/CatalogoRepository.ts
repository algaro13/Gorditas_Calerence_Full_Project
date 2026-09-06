import type { CatalogoDef } from '../../domain/registry';

export interface CatalogoListFilter {
  activo?: boolean;
  search?: string;
}

export type CatalogoRow = Record<string, unknown> & { id: number };

export interface CatalogoRepository {
  list(def: CatalogoDef, filter: CatalogoListFilter, page: { skip: number; take: number }): Promise<{ rows: CatalogoRow[]; total: number }>;
  create(def: CatalogoDef, data: Record<string, unknown>): Promise<CatalogoRow>;
  /** null si no existe. */
  update(def: CatalogoDef, id: number, data: Record<string, unknown>): Promise<CatalogoRow | null>;
  /** false si no existe; lanza ConflictError si está referenciado. */
  delete(def: CatalogoDef, id: number): Promise<boolean>;
}
