import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { BusEventos, emitirCambioTrasMutacion } from '../../src/modules/tiempo-real/eventos';

describe('BusEventos', () => {
  it('avisa solo a las pantallas del mismo restaurante', () => {
    const bus = new BusEventos();
    const a = vi.fn();
    const b = vi.fn();
    bus.suscribir('tenant-a', a);
    bus.suscribir('tenant-b', b);
    bus.publicar('tenant-a', 'ordenes');
    expect(a).toHaveBeenCalledOnce();
    expect(a.mock.calls[0]![0]).toMatchObject({ tipo: 'ordenes' });
    expect(b).not.toHaveBeenCalled();
  });

  it('deja de avisar tras cancelar la suscripción', () => {
    const bus = new BusEventos();
    const a = vi.fn();
    const cancelar = bus.suscribir('t', a);
    cancelar();
    bus.publicar('t', 'inventario');
    expect(a).not.toHaveBeenCalled();
    expect(bus.conexiones('t')).toBe(0);
  });
});

describe('emitirCambioTrasMutacion', () => {
  const correr = (metodo: string, status: number, tenantId: string | undefined) => {
    const bus = new BusEventos();
    const oyente = vi.fn();
    bus.suscribir('t1', oyente);
    let alTerminar: () => void = () => {};
    const req = { method: metodo, tenant: tenantId ? { id: tenantId } : undefined } as unknown as Request;
    const res = { statusCode: status, on: (_: string, fn: () => void) => (alTerminar = fn) } as unknown as Response;
    const next = vi.fn();
    emitirCambioTrasMutacion(bus, 'ordenes')(req, res, next);
    alTerminar();
    expect(next).toHaveBeenCalledOnce();
    return oyente;
  };

  it('emite tras una mutación exitosa', () => expect(correr('POST', 201, 't1')).toHaveBeenCalledOnce());
  it('no emite en lecturas', () => expect(correr('GET', 200, 't1')).not.toHaveBeenCalled());
  it('no emite si la mutación falló', () => expect(correr('PUT', 400, 't1')).not.toHaveBeenCalled());
  it('no emite sin tenant resuelto', () => expect(correr('POST', 200, undefined)).not.toHaveBeenCalled());
});
