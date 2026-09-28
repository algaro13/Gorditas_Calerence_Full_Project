import type { Descuentos } from '../ports/Descuentos';
import type { OrdenRepository } from '../ports/OrdenRepository';

/**
 * Después de cada cambio en las líneas: rehacer los descuentos y recalcular el total.
 *
 * No se aplica una promoción cuando se añade la línea que la gana. Si se hiciera así, quitarla
 * dejaría concedido un descuento que ya nadie merece. Aquí se rehace todo desde lo que la orden
 * tiene ahora, y el resultado reemplaza al anterior — que es posible precisamente porque ningún
 * descuento se escribe a mano: no hay nada que preservar entre una evaluación y la siguiente.
 *
 * Corre dentro de la transacción de quien llama.
 */
export class RecalcularOrden {
  constructor(
    private readonly ordenes: OrdenRepository,
    private readonly descuentos: Descuentos,
  ) {}

  async execute(idOrden: string): Promise<number> {
    await this.descuentos.recalcularDe(idOrden);
    // El total se sigue calculando en un solo sitio; los descuentos son parte de la suma.
    return this.ordenes.recalcularTotal(idOrden);
  }
}
