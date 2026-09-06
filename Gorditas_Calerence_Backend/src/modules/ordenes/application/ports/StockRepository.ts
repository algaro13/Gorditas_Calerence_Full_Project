export interface StockRepository {
  /**
   * Descuenta `cantidad` unidades si hay existencia suficiente y el producto está activo.
   * Devuelve el producto actualizado o null si no fue posible (sin stock / inactivo / inexistente).
   */
  decrementar(idProducto: number, cantidad: number): Promise<{ id: number; nombre: string; costo: number; cantidad: number } | null>;
}
