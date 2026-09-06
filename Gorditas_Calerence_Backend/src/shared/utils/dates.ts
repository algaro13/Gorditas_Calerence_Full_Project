/** Utilidades de fecha con zona horaria explícita (el servidor corre en UTC). */

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatterCache.set(timeZone, f);
  }
  return f;
}

/** YYYY-MM-DD del instante `date` visto desde `timeZone`. */
export function formatDateKey(date: Date, timeZone: string): string {
  return formatter(timeZone).format(date); // en-CA produce YYYY-MM-DD
}

/** Valida YYYY-MM-DD. */
export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}
