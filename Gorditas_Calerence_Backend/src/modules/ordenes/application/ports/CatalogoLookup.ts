import type { CatalogoItem } from '../../domain/types';

/** Lecturas mínimas del catálogo que necesita el módulo de órdenes. */
export interface CatalogoLookup {
  platillo(id: number): Promise<CatalogoItem | null>;
  guiso(id: number): Promise<CatalogoItem | null>;
  producto(id: number): Promise<CatalogoItem | null>;
  extra(id: number): Promise<CatalogoItem | null>;
  mesa(id: number): Promise<CatalogoItem | null>;
  tipoOrden(id: number): Promise<CatalogoItem | null>;
}
