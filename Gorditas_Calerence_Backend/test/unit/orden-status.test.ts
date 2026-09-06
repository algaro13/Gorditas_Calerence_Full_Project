import { describe, expect, it } from 'vitest';
import { canTransition, isOrdenEstatus, ORDEN_ESTATUS } from '../../src/modules/ordenes/domain/OrdenStatus';

describe('Máquina de estados de la orden', () => {
  it('Admin puede cualquier transición', () => {
    for (const a of ORDEN_ESTATUS) for (const b of ORDEN_ESTATUS) expect(canTransition(a, b, ['Admin'])).toBe(true);
  });

  it('Mesero y Encargado comparten la tabla operativa', () => {
    for (const role of ['Mesero', 'Encargado'] as const) {
      expect(canTransition('Pendiente', 'Recepcion', [role])).toBe(true);
      expect(canTransition('Recepcion', 'Surtida', [role])).toBe(true);
      expect(canTransition('Surtida', 'Pagada', [role])).toBe(true);
      expect(canTransition('Entregada', 'Pagada', [role])).toBe(true);
      expect(canTransition('Pagada', 'Recepcion', [role])).toBe(false);
      expect(canTransition('Recepcion', 'Cancelado', [role])).toBe(false);
    }
  });

  it('Despachador y Cocinero no pueden cobrar', () => {
    expect(canTransition('Surtida', 'Pagada', ['Despachador'])).toBe(false);
    expect(canTransition('Surtida', 'Entregada', ['Despachador'])).toBe(true);
    expect(canTransition('Surtida', 'Entregada', ['Cocinero'])).toBe(false);
    expect(canTransition('Preparacion', 'Surtida', ['Cocinero'])).toBe(true);
    expect(canTransition('Pendiente', 'Recepcion', ['Cocinero'])).toBe(false);
  });

  it('con varios roles basta con que uno lo permita', () => {
    expect(canTransition('Surtida', 'Pagada', ['Cocinero', 'Mesero'])).toBe(true);
    expect(canTransition('Surtida', 'Pagada', [])).toBe(false);
  });

  it('isOrdenEstatus', () => {
    expect(isOrdenEstatus('Pagada')).toBe(true);
    expect(isOrdenEstatus('pagada')).toBe(false);
    expect(isOrdenEstatus(null)).toBe(false);
  });
});
