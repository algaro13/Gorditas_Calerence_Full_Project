import type { CatalogoItem } from '../../domain/types';

/** Lecturas mínimas del catálogo que necesita el módulo de órdenes. */
export interface CatalogoLookup {
  platillo(id: number): Promise<CatalogoItem | null>;
  guiso(id: number): Promise<CatalogoItem | null>;
  producto(id: number): Promise<CatalogoItem | null>;
  extra(id: number): Promise<CatalogoItem | null>;
  mesa(id: number): Promise<CatalogoItem | null>;
  tipoOrden(id: number): Promise<CatalogoItem | null>;
  /**
   * El tipo por omision del restaurante: el primero activo de su propio catalogo.
   * Existe porque la pantalla de tomar ordenes no pregunta el tipo, y los ids de catalogo se
   * generan por restaurante, asi que el cliente no puede asumir ninguno.
   */
  tipoOrdenPorOmision(): Promise<CatalogoItem | null>;
}
