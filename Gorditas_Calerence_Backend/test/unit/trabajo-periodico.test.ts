import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrabajoPeriodico } from '../../src/shared/infrastructure/scheduler/TrabajoPeriodico';
import type { Logger } from '../../src/shared/application/ports/Logger';

const UN_DIA = 24 * 60 * 60 * 1000;

function loggerMudo(): Logger {
  const log: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => log,
  };
  return log;
}

/**
 * El plazo de cupo no vence solo si nada lo evalúa. Quien lo evalúa es este trabajo, dentro del
 * propio backend y no en un cron del host, para que un servidor reconstruido desde un respaldo
 * lo tenga sin que nadie se acuerde de instalarlo.
 *
 * Lo que se prueba aquí es que se repite, que no se pisa consigo mismo, que un fallo no lo mata
 * y que al pararlo no queda nada pendiente.
 */
describe('Trabajo periódico', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const crear = (trabajo: () => Promise<void>, primeraEn = 1000) =>
    new TrabajoPeriodico({ nombre: 'prueba', cada: UN_DIA, primeraEn, trabajo, logger: loggerMudo() });

  it('no corre hasta que pasa la espera inicial', async () => {
    const trabajo = vi.fn().mockResolvedValue(undefined);
    crear(trabajo).start();

    expect(trabajo).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(999);
    expect(trabajo).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(trabajo).toHaveBeenCalledTimes(1);
  });

  it('se repite cada intervalo', async () => {
    const trabajo = vi.fn().mockResolvedValue(undefined);
    const t = crear(trabajo);
    t.start();

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(UN_DIA);
    await vi.advanceTimersByTimeAsync(UN_DIA);
    expect(trabajo).toHaveBeenCalledTimes(3);
    t.stop();
  });

  it('se salta la corrida si la anterior sigue en marcha', async () => {
    let resolver: (() => void) | null = null;
    const trabajo = vi.fn(() => new Promise<void>((r) => (resolver = r)));
    const t = crear(trabajo);
    t.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(trabajo).toHaveBeenCalledTimes(1); // arrancó y quedó colgada

    // Pasa un día entero sin que la primera termine: la segunda no se lanza encima.
    await vi.advanceTimersByTimeAsync(UN_DIA);
    expect(trabajo).toHaveBeenCalledTimes(1);

    // Al terminar la primera, el ciclo sigue vivo.
    resolver!();
    await vi.advanceTimersByTimeAsync(UN_DIA);
    expect(trabajo).toHaveBeenCalledTimes(2);
    t.stop();
  });

  it('un fallo no mata el programador: al día siguiente vuelve a intentarlo', async () => {
    const trabajo = vi.fn().mockRejectedValueOnce(new Error('la base se cayó')).mockResolvedValue(undefined);
    const t = crear(trabajo);
    t.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(trabajo).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(UN_DIA);
    expect(trabajo).toHaveBeenCalledTimes(2);
    t.stop();
  });

  it('al pararlo no vuelve a correr', async () => {
    const trabajo = vi.fn().mockResolvedValue(undefined);
    const t = crear(trabajo);
    t.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(trabajo).toHaveBeenCalledTimes(1);

    t.stop();
    await vi.advanceTimersByTimeAsync(UN_DIA * 5);
    expect(trabajo).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pararlo durante una corrida no programa la siguiente', async () => {
    let resolver: (() => void) | null = null;
    const trabajo = vi.fn(() => new Promise<void>((r) => (resolver = r)));
    const t = crear(trabajo);
    t.start();

    await vi.advanceTimersByTimeAsync(1000);
    t.stop();
    resolver!();
    await vi.advanceTimersByTimeAsync(UN_DIA * 2);

    expect(trabajo).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('llamar start dos veces no duplica el temporizador', async () => {
    const trabajo = vi.fn().mockResolvedValue(undefined);
    const t = crear(trabajo);
    t.start();
    t.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(trabajo).toHaveBeenCalledTimes(1);
    t.stop();
  });
});
