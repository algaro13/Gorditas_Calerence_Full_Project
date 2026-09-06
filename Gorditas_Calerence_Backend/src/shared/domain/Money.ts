/**
 * Dinero en MXN con dos decimales. El dominio trabaja con `number` redondeado;
 * la base guarda DECIMAL(12,2) y el serializador convierte Decimal -> number.
 */
export type MoneyLike = number | string | { toString(): string } | null | undefined;

export function toMoney(value: MoneyLike): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value.toString());
  if (!Number.isFinite(n)) return 0;
  return round2(n);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function multiply(unit: MoneyLike, quantity: number): number {
  return round2(toMoney(unit) * quantity);
}

export function sum(values: MoneyLike[]): number {
  return round2(values.reduce<number>((acc, v) => acc + toMoney(v), 0));
}
