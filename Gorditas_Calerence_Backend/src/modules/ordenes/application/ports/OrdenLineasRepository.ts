import type { LineaExtra, LineaPlatillo, LineaProducto, Suborden } from '../../domain/types';

export type LineaKind = 'producto' | 'platillo' | 'extra';

export interface OrdenLineasRepository {
  findSuborden(id: string): Promise<Suborden | null>;
  createSuborden(idOrden: string, nombre: string): Promise<Suborden>;

  createPlatillo(data: Omit<LineaPlatillo, 'id' | 'listo' | 'entregado' | 'createdAt'>): Promise<LineaPlatillo>;
  createProducto(data: Omit<LineaProducto, 'id' | 'listo' | 'entregado' | 'createdAt'>): Promise<LineaProducto>;
  createExtra(data: Omit<LineaExtra, 'id' | 'listo' | 'entregado' | 'createdAt'>): Promise<LineaExtra>;

  findPlatillo(id: string): Promise<LineaPlatillo | null>;
  findProducto(id: string): Promise<LineaProducto | null>;
  findExtra(id: string): Promise<LineaExtra | null>;

  updateFlags(kind: LineaKind, id: string, data: Partial<{ listo: boolean; entregado: boolean }>): Promise<boolean>;
  updatePlatilloNotas(id: string, notas: string | null): Promise<boolean>;
  deleteLinea(kind: LineaKind, id: string): Promise<boolean>;

  /** Orden a la que pertenece una línea (null si no existe). */
  ordenIdOf(kind: LineaKind, id: string): Promise<string | null>;
}
