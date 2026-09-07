/**
 * Precio de venta de un platillo del catálogo.
 *
 * La tabla guarda dos columnas de dinero: `precio` es el precio de venta y es el que usa el
 * servidor para cobrar; `costo` quedó como campo heredado y en los restaurantes creados por el
 * asistente de registro vale cero. Por eso siempre se prefiere `precio` y solo se cae a `costo`
 * cuando el primero no tiene valor.
 */
export function precioVenta(item: { precio?: number | string | null; costo?: number | string | null } | null | undefined): number {
  if (!item) return 0;
  const precio = Number(item.precio ?? 0);
  if (precio > 0) return precio;
  const costo = Number(item.costo ?? 0);
  return costo > 0 ? costo : 0;
}
