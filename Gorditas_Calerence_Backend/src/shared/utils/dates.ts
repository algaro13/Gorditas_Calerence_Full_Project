/** Utilidades de fecha con zona horaria explícita (el servidor corre en UTC). */

const dayFormatterCache = new Map<string, Intl.DateTimeFormat>();
const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = dayFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    dayFormatterCache.set(timeZone, f);
  }
  return f;
}

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsFormatterCache.set(timeZone, f);
  }
  return f;
}

/** YYYY-MM-DD del instante `date` visto desde `timeZone`. */
export function formatDateKey(date: Date, timeZone: string): string {
  return dayFormatter(timeZone).format(date); // en-CA produce YYYY-MM-DD
}

/** Valida YYYY-MM-DD. */
export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Desfase (ms) de `timeZone` respecto a UTC en el instante `ts`. */
function tzOffsetMs(ts: number, timeZone: string): number {
  const parts = partsFormatter(timeZone).formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - ts;
}

/** Instante UTC que corresponde a la medianoche local de `dateKey` en `timeZone`. */
export function startOfDayInZone(dateKey: string, timeZone: string): Date {
  const guess = Date.parse(`${dateKey}T00:00:00Z`);
  const offset = tzOffsetMs(guess, timeZone);
  const candidate = guess - offset;
  // Segunda pasada por si el desfase cambia justo en ese instante (DST)
  return new Date(guess - tzOffsetMs(candidate, timeZone));
}

/** Rango semiabierto [inicio, fin) que cubre los días `from..to` (YYYY-MM-DD) en `timeZone`. */
export function dayRange(from: string, to: string, timeZone: string): { from: Date; to: Date } {
  const start = startOfDayInZone(from, timeZone);
  const endKey = addDays(to, 1);
  return { from: start, to: startOfDayInZone(endKey, timeZone) };
}

export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
