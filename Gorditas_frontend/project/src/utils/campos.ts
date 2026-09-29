/**
 * Lo que hay en un campo numérico: vacío es «sin valor», no cero.
 *
 * Convertir en cada tecla con `parseFloat(v) || 0` hacía imposible vaciar el campo: al borrar el
 * último dígito el valor volvía a 0 y el 0 reaparecía, así que para escribir 60 había que dejar
 * «060» o seleccionar y sobrescribir. Con `valor || anterior` era peor: al borrar volvía el valor
 * de antes, y un 0 escrito a propósito —existencia agotada— se guardaba como si no se hubiera
 * tocado.
 *
 * El campo guarda `null` mientras está vacío y se muestra con `valor ?? ''`. Qué significa vacío
 * al guardar lo decide cada pantalla.
 */
export const numeroDeCampo = (v: string): number | null => (v.trim() === '' ? null : Number(v));
