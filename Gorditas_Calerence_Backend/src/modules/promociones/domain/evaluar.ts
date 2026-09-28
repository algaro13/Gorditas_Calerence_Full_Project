import { round2 } from '../../../shared/domain/Money';

/**
 * Qué promociones se ganan con lo que hay en una orden, y cuánto quitan.
 *
 * Función pura a propósito: recibe las líneas y las promociones, devuelve los descuentos. No
 * toca la base ni el reloj del sistema —el instante llega como argumento—, así que las reglas
 * que decide se pueden probar una a una sin levantar nada.
 *
 * Se evalúa entera cada vez que cambia la orden, en vez de aplicarse al añadir una línea. Si se
 * aplicara al añadir, quitar una gordita dejaría el 3x2 mal calculado: el descuento se habría
 * concedido y nadie volvería a preguntarse si sigue mereciéndose.
 */

export type FormaPromocion = 'combo' | 'nxm' | 'porcentaje';

/** Una línea de la orden, reducida a lo que las reglas necesitan mirar. */
export interface LineaEvaluable {
  tipo: 'platillo' | 'producto';
  /** Del catálogo: `idPlatillo` o `idProducto`. Es por lo que una promoción señala artículos. */
  idCatalogo: number;
  /** Solo para platillos; permite que una promoción hable de una categoría entera. */
  idTipoPlatillo?: number | null;
  cantidad: number;
  /** Precio de carta de una unidad. */
  precioUnitario: number;
}

export interface PromocionItem {
  idPlatillo?: number | null;
  idProducto?: number | null;
  cantidad: number;
}

export interface PromocionEvaluable {
  id: number;
  nombre: string;
  forma: FormaPromocion;
  activo: boolean;
  combinable: boolean;
  /** combo */
  precio?: number | null;
  /** nxm */
  lleva?: number | null;
  paga?: number | null;
  /** porcentaje */
  porcentaje?: number | null;
  /** Alcance por categoría; sin él y sin items, la promoción mira la orden entera. */
  idTipoPlatillo?: number | null;
  items: PromocionItem[];
  desde?: Date | null;
  hasta?: Date | null;
  /** 0 = domingo. Vacío = todos los días. */
  diasSemana: number[];
  /** `HH:MM` en la zona del negocio. */
  horaInicio?: string | null;
  horaFin?: string | null;
}

export interface DescuentoCalculado {
  idPromocion: number;
  nombre: string;
  /** Negativo: es una línea más de la orden, y el total es la suma de sus líneas. */
  importe: number;
}

/** El día de la semana y la hora en la zona del negocio, sin depender de la del servidor. */
function momentoEn(zona: string, ahora: Date): { dia: number; minutos: number; fecha: string } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(ahora);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? '';
  const dias: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dia: dias[p('weekday')] ?? 0,
    minutos: Number(p('hour')) * 60 + Number(p('minute')),
    fecha: `${p('year')}-${p('month')}-${p('day')}`,
  };
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * Si la promoción está vigente en este instante, mirado desde el restaurante.
 *
 * La zona importa: una hora feliz de 16 a 18 evaluada en UTC empieza a las diez de la mañana en
 * México. Es el mismo fallo que el día del reporte calculado con `toISOString()`.
 */
export function estaVigente(promo: PromocionEvaluable, ahora: Date, zona: string): boolean {
  if (!promo.activo) return false;
  const { dia, minutos, fecha } = momentoEn(zona, ahora);

  if (promo.desde && fecha < promo.desde.toISOString().slice(0, 10)) return false;
  if (promo.hasta && fecha > promo.hasta.toISOString().slice(0, 10)) return false;
  if (promo.diasSemana.length > 0 && !promo.diasSemana.includes(dia)) return false;

  if (promo.horaInicio && promo.horaFin) {
    const inicio = aMinutos(promo.horaInicio);
    const fin = aMinutos(promo.horaFin);
    // Una franja que cruza la medianoche (22:00–02:00) es dos tramos, no uno vacío.
    const dentro = inicio <= fin ? minutos >= inicio && minutos < fin : minutos >= inicio || minutos < fin;
    if (!dentro) return false;
  }
  return true;
}

/** Las líneas sobre las que una promoción tiene algo que decir. */
function alcance(promo: PromocionEvaluable, lineas: LineaEvaluable[]): LineaEvaluable[] {
  if (promo.items.length > 0) {
    return lineas.filter((l) =>
      promo.items.some((i) =>
        l.tipo === 'platillo' ? i.idPlatillo === l.idCatalogo : i.idProducto === l.idCatalogo,
      ),
    );
  }
  if (promo.idTipoPlatillo != null) {
    return lineas.filter((l) => l.tipo === 'platillo' && l.idTipoPlatillo === promo.idTipoPlatillo);
  }
  return lineas;
}

/** Cada unidad por separado, para poder regalar la más barata y no una línea entera. */
function unidades(lineas: LineaEvaluable[]): number[] {
  const out: number[] = [];
  for (const l of lineas) for (let i = 0; i < l.cantidad; i++) out.push(l.precioUnitario);
  return out;
}

function descuentoCombo(promo: PromocionEvaluable, lineas: LineaEvaluable[]): number {
  if (promo.precio == null || promo.items.length === 0) return 0;

  // Cuántas veces cabe el combo entero en la orden. Si falta uno de sus artículos, no cabe
  // ninguna: un combo es el conjunto, no una parte.
  let veces = Infinity;
  let precioDelConjunto = 0;
  for (const item of promo.items) {
    const suyas = lineas.filter((l) =>
      l.tipo === 'platillo' ? item.idPlatillo === l.idCatalogo : item.idProducto === l.idCatalogo,
    );
    const disponibles = suyas.reduce((n, l) => n + l.cantidad, 0);
    if (disponibles < item.cantidad) return 0;
    veces = Math.min(veces, Math.floor(disponibles / item.cantidad));
    // A precio de carta, que es lo que el combo sustituye.
    const unitario = suyas[0]?.precioUnitario ?? 0;
    precioDelConjunto += unitario * item.cantidad;
  }
  if (!Number.isFinite(veces) || veces <= 0) return 0;

  const ahorroPorCombo = precioDelConjunto - promo.precio;
  return ahorroPorCombo > 0 ? round2(ahorroPorCombo * veces) : 0;
}

function descuentoNxM(promo: PromocionEvaluable, lineas: LineaEvaluable[]): number {
  const lleva = promo.lleva ?? 0;
  const paga = promo.paga ?? 0;
  if (lleva <= 0 || paga <= 0 || paga >= lleva) return 0;

  // Se regalan las más baratas: es lo que espera el cliente y lo que hace cualquier caja.
  const precios = unidades(alcance(promo, lineas)).sort((a, b) => a - b);
  const grupos = Math.floor(precios.length / lleva);
  if (grupos <= 0) return 0;

  const gratis = grupos * (lleva - paga);
  return round2(precios.slice(0, gratis).reduce((s, p) => s + p, 0));
}

function descuentoPorcentaje(promo: PromocionEvaluable, lineas: LineaEvaluable[]): number {
  const pct = promo.porcentaje ?? 0;
  if (pct <= 0) return 0;
  const base = alcance(promo, lineas).reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
  // Se redondea una vez, al final: repartir el descuento entre líneas hace que las partes dejen
  // de sumar el todo.
  return round2((base * pct) / 100);
}

/** Lo que una promoción quitaría, sin mirar todavía si compite con otras. */
export function descuentoDe(promo: PromocionEvaluable, lineas: LineaEvaluable[]): number {
  switch (promo.forma) {
    case 'combo':
      return descuentoCombo(promo, lineas);
    case 'nxm':
      return descuentoNxM(promo, lineas);
    case 'porcentaje':
      return descuentoPorcentaje(promo, lineas);
    default:
      return 0;
  }
}

/**
 * Los descuentos que gana una orden.
 *
 * Las combinables se conceden todas; entre las que no lo son, solo la que más favorece al
 * cliente. Sin esta regla el mismo ticket daría importes distintos según el orden en que se
 * evalúen, que es imposible de explicar en la caja e imposible de probar.
 */
export function evaluarPromociones(
  lineas: LineaEvaluable[],
  promociones: PromocionEvaluable[],
  ahora: Date,
  zona: string,
): DescuentoCalculado[] {
  const candidatas = promociones
    .filter((p) => estaVigente(p, ahora, zona))
    .map((p) => ({ promo: p, importe: descuentoDe(p, lineas) }))
    .filter((c) => c.importe > 0);

  const combinables = candidatas.filter((c) => c.promo.combinable);
  const exclusivas = candidatas.filter((c) => !c.promo.combinable);

  const mejor = exclusivas.reduce<(typeof exclusivas)[number] | null>(
    // A igualdad de importe gana la de menor id: así dos corridas dan el mismo ticket.
    (a, b) => (a === null || b.importe > a.importe || (b.importe === a.importe && b.promo.id < a.promo.id) ? b : a),
    null,
  );

  const elegidas = mejor ? [...combinables, mejor] : combinables;
  return elegidas
    .sort((a, b) => a.promo.id - b.promo.id)
    .map((c) => ({ idPromocion: c.promo.id, nombre: c.promo.nombre, importe: -c.importe }));
}
