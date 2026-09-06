import { Prisma } from '@prisma/client';
import { currentDb } from './unit-of-work';
import { formatDateKey } from '../../utils/dates';

/** Incremento atómico por tenant (el tenant lo pone current_tenant_id()). */
export async function nextCounter(key: string): Promise<number> {
  const rows = await currentDb().$queryRaw<Array<{ value: bigint }>>(Prisma.sql`
    INSERT INTO counters (tenant_id, key, value)
    VALUES (current_tenant_id(), ${key}, 1)
    ON CONFLICT (tenant_id, key) DO UPDATE SET value = counters.value + 1
    RETURNING value
  `);
  return Number(rows[0].value);
}

/** Folio de orden: ORD-YYMMDD-NNNN (fecha en la zona horaria del negocio). */
export async function generateFolio(now: Date, timeZone: string): Promise<string> {
  const ymd = formatDateKey(now, timeZone); // YYYY-MM-DD
  const yymmdd = ymd.slice(2).replace(/-/g, '');
  const seq = await nextCounter(`orden-${ymd}`);
  return `ORD-${yymmdd}-${String(seq).padStart(4, '0')}`;
}

/** Número de pedido del día (para llevar), reinicia cada día. */
export async function nextPedidoNumber(now: Date, timeZone: string): Promise<number> {
  const ymd = formatDateKey(now, timeZone).replace(/-/g, '');
  return nextCounter(`pedido-${ymd}`);
}
