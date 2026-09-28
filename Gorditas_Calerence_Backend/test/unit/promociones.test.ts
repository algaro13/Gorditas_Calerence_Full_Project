import { describe, expect, it } from 'vitest';
import {
  descuentoDe,
  estaVigente,
  evaluarPromociones,
  type LineaEvaluable,
  type PromocionEvaluable,
} from '../../src/modules/promociones/domain/evaluar';

/**
 * El evaluador es una función pura, así que estas pruebas no levantan base ni servidor: cada
 * regla se puede mirar sola. Es lo que permite afirmar cosas incómodas —una hora feliz a las
 * diez de la mañana, dos promociones compitiendo— sin montar una orden de verdad.
 */

const ZONA = 'America/Mexico_City';

const promo = (p: Partial<PromocionEvaluable>): PromocionEvaluable => ({
  id: 1,
  nombre: 'Promo',
  forma: 'porcentaje',
  activo: true,
  combinable: false,
  items: [],
  diasSemana: [],
  ...p,
});

const gordita = (cantidad: number, precio = 25): LineaEvaluable => ({
  tipo: 'platillo',
  idCatalogo: 1,
  idTipoPlatillo: 10,
  cantidad,
  precioUnitario: precio,
});

const refresco = (cantidad: number, precio = 15): LineaEvaluable => ({
  tipo: 'producto',
  idCatalogo: 2,
  cantidad,
  precioUnitario: precio,
});

describe('Promociones: las tres formas', () => {
  it('combo: cobra el conjunto a su precio y descuenta la diferencia', () => {
    const combo = promo({
      forma: 'combo',
      precio: 60,
      items: [
        { idPlatillo: 1, cantidad: 2 },
        { idProducto: 2, cantidad: 1 },
      ],
    });
    // Dos gorditas (50) y un refresco (15) valen 65 de carta; el combo cuesta 60.
    expect(descuentoDe(combo, [gordita(2), refresco(1)])).toBe(5);
  });

  it('combo: si falta uno de sus artículos no aplica, aunque sobren los otros', () => {
    const combo = promo({
      forma: 'combo',
      precio: 60,
      items: [
        { idPlatillo: 1, cantidad: 2 },
        { idProducto: 2, cantidad: 1 },
      ],
    });
    // Un combo es el conjunto. Cuatro gorditas sin refresco no son dos mitades de combo.
    expect(descuentoDe(combo, [gordita(4)])).toBe(0);
  });

  it('combo: cabe tantas veces como la orden lo contenga entero', () => {
    const combo = promo({
      forma: 'combo',
      precio: 60,
      items: [
        { idPlatillo: 1, cantidad: 2 },
        { idProducto: 2, cantidad: 1 },
      ],
    });
    expect(descuentoDe(combo, [gordita(5), refresco(2)])).toBe(10);
  });

  it('nxm: regala las unidades más baratas, no la línea entera', () => {
    const tresPorDos = promo({ forma: 'nxm', lleva: 3, paga: 2, idTipoPlatillo: 10 });
    const caras = { ...gordita(2, 30), idCatalogo: 3 };
    // Cinco platillos de la misma categoría: un grupo de tres, y lo gratis es lo más barato.
    expect(descuentoDe(tresPorDos, [gordita(3, 25), caras])).toBe(25);
  });

  it('nxm: sin grupo completo no hay nada que regalar', () => {
    const tresPorDos = promo({ forma: 'nxm', lleva: 3, paga: 2, idTipoPlatillo: 10 });
    expect(descuentoDe(tresPorDos, [gordita(2)])).toBe(0);
  });

  it('porcentaje: sobre su categoría, no sobre la orden entera', () => {
    const diezEnGorditas = promo({ forma: 'porcentaje', porcentaje: 10, idTipoPlatillo: 10 });
    // 75 de gorditas al 10 %; el refresco no es de la categoría.
    expect(descuentoDe(diezEnGorditas, [gordita(3), refresco(1)])).toBe(7.5);
  });

  it('porcentaje: sin categoría ni artículos, mira la orden entera', () => {
    const diez = promo({ forma: 'porcentaje', porcentaje: 10 });
    expect(descuentoDe(diez, [gordita(3), refresco(1)])).toBe(9);
  });

  it('porcentaje: redondea una vez, al final', () => {
    const quince = promo({ forma: 'porcentaje', porcentaje: 15 });
    // 37.50 × 15 % = 5.625. Repartirlo entre líneas haría que las partes dejaran de sumar el todo.
    expect(descuentoDe(quince, [gordita(1, 37.5)])).toBe(5.63);
  });
});

describe('Promociones: cuándo están vigentes', () => {
  // 17:00 en Ciudad de México es 23:00 UTC del mismo día.
  const tarde = new Date('2026-09-29T23:00:00Z');
  // 10:00 en Ciudad de México es 16:00 UTC.
  const manana = new Date('2026-09-29T16:00:00Z');

  it('una hora feliz de 16 a 18 no aplica a las diez de la mañana', () => {
    const feliz = promo({ horaInicio: '16:00', horaFin: '18:00' });
    expect(estaVigente(feliz, tarde, ZONA)).toBe(true);
    // Si la franja se interpretara en UTC, las 16:00 UTC caerían dentro y esto sería `true`.
    expect(estaVigente(feliz, manana, ZONA)).toBe(false);
  });

  it('una franja que cruza la medianoche son dos tramos, no uno vacío', () => {
    const nocturna = promo({ horaInicio: '22:00', horaFin: '02:00' });
    const once = new Date('2026-09-30T05:00:00Z'); // 23:00 del 29 en México
    const una = new Date('2026-09-30T07:00:00Z'); // 01:00 del 30
    const seis = new Date('2026-09-30T12:00:00Z'); // 06:00 del 30
    expect(estaVigente(nocturna, once, ZONA)).toBe(true);
    expect(estaVigente(nocturna, una, ZONA)).toBe(true);
    expect(estaVigente(nocturna, seis, ZONA)).toBe(false);
  });

  it('el día de la semana es el del restaurante', () => {
    // 2026-09-29 es martes en México a las 17:00; en UTC ya son las 23:00 del mismo martes.
    const martes = promo({ diasSemana: [2] });
    expect(estaVigente(martes, tarde, ZONA)).toBe(true);
    const miercoles = promo({ diasSemana: [3] });
    expect(estaVigente(miercoles, tarde, ZONA)).toBe(false);
  });

  it('fuera de sus fechas, o desactivada, no aplica', () => {
    expect(estaVigente(promo({ hasta: new Date('2026-09-01') }), tarde, ZONA)).toBe(false);
    expect(estaVigente(promo({ desde: new Date('2026-12-01') }), tarde, ZONA)).toBe(false);
    expect(estaVigente(promo({ activo: false }), tarde, ZONA)).toBe(false);
  });
});

describe('Promociones: cuando varias aplican', () => {
  const ahora = new Date('2026-09-29T23:00:00Z');
  const lineas = [gordita(3), refresco(1)];

  it('sin marca de combinable, gana la que más favorece al cliente', () => {
    const chica = promo({ id: 1, nombre: '5 % en todo', forma: 'porcentaje', porcentaje: 5 });
    const grande = promo({ id: 2, nombre: '3x2 en gorditas', forma: 'nxm', lleva: 3, paga: 2, idTipoPlatillo: 10 });

    const r = evaluarPromociones(lineas, [chica, grande], ahora, ZONA);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ idPromocion: 2, nombre: '3x2 en gorditas', importe: -25 });
  });

  it('el orden en que se evalúen no cambia el ticket', () => {
    const a = promo({ id: 1, nombre: 'A', forma: 'porcentaje', porcentaje: 5 });
    const b = promo({ id: 2, nombre: 'B', forma: 'nxm', lleva: 3, paga: 2, idTipoPlatillo: 10 });
    expect(evaluarPromociones(lineas, [a, b], ahora, ZONA)).toEqual(
      evaluarPromociones(lineas, [b, a], ahora, ZONA),
    );
  });

  it('una combinable se concede junto a la mejor de las demás', () => {
    const cupon = promo({ id: 1, nombre: 'Cupón', forma: 'porcentaje', porcentaje: 5, combinable: true });
    const tresPorDos = promo({ id: 2, nombre: '3x2', forma: 'nxm', lleva: 3, paga: 2, idTipoPlatillo: 10 });

    const r = evaluarPromociones(lineas, [cupon, tresPorDos], ahora, ZONA);
    expect(r.map((d) => d.nombre)).toEqual(['Cupón', '3x2']);
    expect(r.reduce((s, d) => s + d.importe, 0)).toBe(-29.5);
  });

  it('una promoción que no gana nada no ensucia el ticket con una línea de cero', () => {
    const sinEfecto = promo({ id: 1, forma: 'nxm', lleva: 3, paga: 2, idTipoPlatillo: 99 });
    expect(evaluarPromociones(lineas, [sinEfecto], ahora, ZONA)).toEqual([]);
  });

  it('volver a evaluar una orden que no cambió da lo mismo', () => {
    const p = [promo({ id: 1, forma: 'nxm', lleva: 3, paga: 2, idTipoPlatillo: 10 })];
    expect(evaluarPromociones(lineas, p, ahora, ZONA)).toEqual(evaluarPromociones(lineas, p, ahora, ZONA));
  });

  it('quitar la línea que ganaba la promoción retira su descuento', () => {
    const p = [promo({ id: 1, forma: 'nxm', lleva: 3, paga: 2, idTipoPlatillo: 10 })];
    expect(evaluarPromociones(lineas, p, ahora, ZONA)).toHaveLength(1);
    // Con dos gorditas ya no se gana el grupo de tres.
    expect(evaluarPromociones([gordita(2), refresco(1)], p, ahora, ZONA)).toEqual([]);
  });
});
