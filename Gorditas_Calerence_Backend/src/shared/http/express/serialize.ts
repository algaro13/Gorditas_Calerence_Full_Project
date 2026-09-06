/**
 * Convierte filas de Prisma al contrato JSON histórico del frontend:
 *  - `id` -> `_id`
 *  - Decimal / bigint -> number
 *  - joins aplanados según `flatten` ("tipoProducto.nombre" -> "nombreTipoProducto");
 *    la relación aplanada se elimina del resultado.
 */
export type FlattenMap = Record<string, string>;

function isDecimalLike(v: object): boolean {
  return (v as { constructor?: { name?: string } }).constructor?.name === 'Decimal';
}

export function toApi<T = unknown>(value: unknown, flatten?: FlattenMap): T {
  return convert(value, flatten) as T;
}

function convert(value: unknown, flatten?: FlattenMap): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((v) => convert(v, flatten));
  if (isDecimalLike(value)) return Number(String(value));

  const src = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    out[k === 'id' ? '_id' : k] = convert(v, flatten);
  }
  if (flatten) {
    for (const [path, target] of Object.entries(flatten)) {
      const [rel, field] = path.split('.');
      const relObj = src[rel];
      if (relObj && typeof relObj === 'object' && field in (relObj as object)) {
        out[target] = convert((relObj as Record<string, unknown>)[field]);
      }
      delete out[rel];
    }
  }
  return out;
}
