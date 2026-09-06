/**
 * Convierte filas de Prisma al contrato JSON histórico del frontend:
 *  - `id` -> `_id`
 *  - Decimal / bigint -> number
 *  - `tenantId` nunca sale al cliente
 *  - joins aplanados según `flatten` ("tipoProducto.nombre" -> "nombreTipoProducto");
 *    la relación aplanada se elimina del resultado.
 */
export type FlattenMap = Record<string, string>;

const HIDDEN_KEYS = new Set(['tenantId', 'tenant_id']);

/** Prisma.Decimal (decimal.js): por nombre de clase o por su forma interna { d[], e, s } + toFixed. */
function isDecimalLike(v: object): boolean {
  const o = v as { constructor?: { name?: string }; d?: unknown; e?: unknown; s?: unknown; toFixed?: unknown };
  if (o.constructor?.name === 'Decimal') return true;
  return Array.isArray(o.d) && typeof o.e === 'number' && typeof o.s === 'number' && typeof o.toFixed === 'function';
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
    if (HIDDEN_KEYS.has(k)) continue;
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
