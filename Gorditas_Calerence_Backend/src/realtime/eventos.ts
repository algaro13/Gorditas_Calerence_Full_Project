import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models';

/**
 * Canal de tiempo real para las pantallas del POS.
 *
 * Patrón "señal + refetch": el servidor NO empuja los datos, solo avisa "algo cambió".
 * El frontend, al recibir el aviso, vuelve a consultar. Así el backend se mantiene simple
 * y evitamos el polling agresivo que saturaba el proxy (una petición cada 8-15 s por pantalla).
 */

const bus = new EventEmitter();
// Una pantalla = un oyente. Puede haber muchas, así que quitamos el tope por defecto (10).
bus.setMaxListeners(0);

export type TipoEvento = 'ordenes' | 'inventario';

/** Publica una señal de cambio hacia todas las pantallas conectadas. */
export function publicarCambio(tipo: TipoEvento): void {
  bus.emit('cambio', { tipo, ts: Date.now() });
}

/**
 * EventSource (el cliente SSE del navegador) no puede mandar cabeceras, así que el token
 * JWT llega por query string. Validamos igual que `authenticate`.
 */
async function autenticarSSE(req: Request): Promise<boolean> {
  try {
    const token =
      (req.query.token as string) || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return false;
    const JWT_SECRET = process.env.JWT_SECRET || 'StAn121120360ne';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await Usuario.findById(decoded.id);
    return !!(user && user.activo);
  } catch {
    return false;
  }
}

/** Handler del endpoint SSE (`GET /api/eventos`). */
export async function streamEventos(req: Request, res: Response): Promise<void> {
  if (!(await autenticarSSE(req))) {
    res.status(401).end();
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Desactiva el buffering de nginx/Nginx Proxy Manager para esta respuesta:
    // sin esto, el proxy retiene los eventos y el tiempo real deja de serlo.
    'X-Accel-Buffering': 'no',
  });
  // Si la conexión se corta, el navegador reintenta a los 5 s.
  res.write('retry: 5000\n\n');

  const enviar = (dato: { tipo: TipoEvento; ts: number }) => {
    res.write('event: cambio\n');
    res.write(`data: ${JSON.stringify(dato)}\n\n`);
  };
  bus.on('cambio', enviar);

  // Latido cada 25 s: Cloudflare cierra conexiones ociosas (~100 s) y el proxy también.
  const latido = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  const limpiar = () => {
    clearInterval(latido);
    bus.off('cambio', enviar);
    res.end();
  };
  req.on('close', limpiar);
}

/**
 * Middleware para los routers que mutan datos: tras una respuesta exitosa a un método que
 * no sea de lectura, publica la señal de cambio. Así no hay que instrumentar cada handler.
 */
export function emitirCambioTrasMutacion(tipo: TipoEvento) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const metodo = req.method.toUpperCase();
    if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') {
      return next();
    }
    _res.on('finish', () => {
      if (_res.statusCode < 400) publicarCambio(tipo);
    });
    next();
  };
}
