/**
 * Lo único que la orden necesita saber de los descuentos: que hay que rehacerlos.
 *
 * Deliberadamente no habla de promociones. Quien decide cuándo recalcular es la orden —es la
 * que cambia—, pero qué descuentos se ganan no es asunto suyo. Con este puerto, añadir un
 * platillo no depende de un módulo que solo sabe de reglas.
 */
export interface Descuentos {
  /** Rehace los descuentos de la orden desde sus líneas actuales. */
  recalcularDe(idOrden: string): Promise<void>;
}

/** Para las pruebas y para arrancar sin promociones: no hay descuentos que rehacer. */
export const SIN_DESCUENTOS: Descuentos = { recalcularDe: async () => {} };
