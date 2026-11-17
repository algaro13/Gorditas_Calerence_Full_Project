import { EventEmitter } from 'node:events';
import type { Request, RequestHandler, Response } from 'express';

/**
 * Canal de tiempo real (SSE) para las pantallas del POS.
 *
 * Patrón «señal + refetch»: el servidor NO empuja datos, solo avisa «algo cambió» y la pantalla
 * vuelve a consultar. Reemplaza el polling de 8-15 s por pantalla.
 *
 * Aislamiento: cada restaurante tiene su propio canal (clave = `tenant.id`). Una mutación de un
 * restaurante nunca avisa, ni siquiera como señal, a las pantallas de otro.
 */

export type TipoEvento = 'ordenes' | 'inventario';

export interface EventoCambio {
  tipo: TipoEvento;
  ts: number;
}

const LATIDO_MS = 25_000;

export class BusEventos {
  private readonly emisor = new EventEmitter();

  constructor() {
    // Una pantalla = un oyente; puede haber muchas.
    this.emisor.setMaxListeners(0);
  }

  publicar(tenantId: string, tipo: TipoEvento): void {
    this.emisor.emit(tenantId, { tipo, ts: Date.now() } satisfies EventoCambio);
  }

  /** Suscribe y devuelve la función para cancelar. */
  suscribir(tenantId: string, oyente: (e: EventoCambio) => void): () => void {
    this.emisor.on(tenantId, oyente);
    return () => this.emisor.off(tenantId, oyente);
  }

  /** Conexiones abiertas de un restaurante (para pruebas y diagnóstico). */
  conexiones(tenantId: string): number {
    return this.emisor.listenerCount(tenantId);
  }
}

/**
 * `GET /api/eventos`. Va detrás de `authenticate` + `tenantContext` (+ plan), así que `req.tenant`
 * ya está resuelto y el token viaja por la cabecera `Authorization`, nunca por la URL.
 */
export function streamEventos(bus: BusEventos, latidoMs = LATIDO_MS): RequestHandler {
  return (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Sin esto nginx / Nginx Proxy Manager retienen los eventos y el tiempo real deja de serlo.
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 5000\n\n');

    const cancelar = bus.suscribir(tenantId, (dato) => {
      res.write('event: cambio\n');
      res.write(`data: ${JSON.stringify(dato)}\n\n`);
    });
    // Cloudflare y el proxy cierran conexiones ociosas (~100 s).
    const latido = setInterval(() => res.write(': ping\n\n'), latidoMs);

    req.on('close', () => {
      clearInterval(latido);
      cancelar();
      res.end();
    });
  };
}

/**
 * Para routers que mutan: tras una respuesta exitosa a un método de escritura publica la señal
 * del restaurante. Debe montarse DESPUÉS de `tenantContext`.
 */
export function emitirCambioTrasMutacion(bus: BusEventos, tipo: TipoEvento): RequestHandler {
  return (req, res, next) => {
    const metodo = req.method.toUpperCase();
    if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') return next();
    const tenantId = req.tenant?.id;
    if (tenantId) {
      res.on('finish', () => {
        if (res.statusCode < 400) bus.publicar(tenantId, tipo);
      });
    }
    next();
  };
}
