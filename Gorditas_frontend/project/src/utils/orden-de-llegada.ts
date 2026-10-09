/**
 * El servicio se atiende en orden de llegada: lo que entró primero, se surte y se cobra primero.
 * Cocina y caja usan estas funciones para no ordenar cada una a su manera.
 */

type ConFecha = { fechaHora?: string | Date | null; fecha?: string | Date | null };
type ConCaptura = { createdAt?: string | Date | null };

/** Milisegundos de una fecha, o `Infinity` si falta o no es válida: lo que no tiene hora va al final. */
function ms(valor: string | Date | null | undefined): number {
  if (!valor) return Infinity;
  const t = new Date(valor).getTime();
  return Number.isNaN(t) ? Infinity : t;
}

/** Hora en que se tomó la orden. */
export const horaDeOrden = (o: ConFecha): number => ms(o.fechaHora ?? o.fecha);

/** Copia ordenada de la más antigua a la más nueva. Con la misma hora conserva el orden recibido. */
function ascendente<T>(items: T[], hora: (t: T) => number): T[] {
  return items
    .map((item, i) => ({ item, i, t: hora(item) }))
    .sort((a, b) => (a.t === b.t ? a.i - b.i : a.t < b.t ? -1 : 1))
    .map((x) => x.item);
}

/** Órdenes de la más antigua a la más nueva. */
export const ordenesPorLlegada = <T extends ConFecha>(ordenes: T[]): T[] => ascendente(ordenes, horaDeOrden);

/** Platillos o productos en el orden en que se capturaron. */
export const lineasPorCaptura = <T extends ConCaptura>(lineas: T[]): T[] => ascendente(lineas, (l) => ms(l.createdAt));

/**
 * Mesas por su orden más antigua, y dentro de cada mesa sus órdenes de la más antigua a la más
 * nueva. Nunca por nombre: «Mesa 10» puede llevar más tiempo esperando que «Mesa 2».
 */
export function mesasPorLlegada<M extends { ordenes: O[] }, O extends ConFecha>(mesas: M[]): M[] {
  const conOrden = mesas.map((m) => ({ ...m, ordenes: ordenesPorLlegada(m.ordenes) }));
  return ascendente(conOrden, (m) => (m.ordenes.length ? horaDeOrden(m.ordenes[0]) : Infinity));
}
