import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import type { Container } from './container';
import { notFound } from './shared/http/express/error-handler';
import { nextPedidoNumber } from './shared/infrastructure/prisma/counters';
import { createTenantsRouter } from './modules/tenants/http/tenants.router';
import { createOrdenesModule } from './modules/ordenes';
import { createCatalogosModule } from './modules/catalogos';
import { createUsuariosModule } from './modules/usuarios';
import { createInventarioModule } from './modules/inventario';
import { createReportesModule } from './modules/reportes';

export function createApp(c: Container): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Archivos subidos (logos): CORP abierto porque el SPA vive en otro origen.
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(c.env.UPLOADS_DIR, { index: false, dotfiles: 'deny' }),
  );

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, isAllowedOrigin(origin, c)),
      credentials: true,
      optionsSuccessStatus: 200,
    }),
  );

  app.use(
    pinoHttp({
      logger: c.pino,
      genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
      autoLogging: c.env.NODE_ENV !== 'test',
      customProps: (req) => ({ tenantId: (req as express.Request).tenant?.id, userId: (req as express.Request).auth?.userId }),
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: c.env.NODE_ENV, time: c.clock.now().toISOString() });
  });

  // El webhook de Stripe necesita el body crudo: se monta ANTES de express.json (change de billing).
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  const { authenticate, tenantContext, planGuard } = c.middlewares;
  const pos = [authenticate, tenantContext, planGuard];
  const timeZone = c.env.APP_TZ;

  app.use('/api/tenants', createTenantsRouter({ tenants: c.tenants, urls: c.urls, authenticate, tenantContext }));

  const ordenes = createOrdenesModule({ uow: c.uow, clock: c.clock, timeZone });
  const usuarios = createUsuariosModule({ uow: c.uow, identity: c.identityProvider, logger: c.logger.child({ module: 'usuarios' }) });
  const catalogos = createCatalogosModule({
    uow: c.uow,
    nextPedidoNumber: () => c.uow.run(() => nextPedidoNumber(c.clock.now(), timeZone)),
    listarPersonal: () => usuarios.listar.execute(),
  });
  const inventario = createInventarioModule({ uow: c.uow });
  const reportes = createReportesModule({ uow: c.uow, clock: c.clock, timeZone });

  app.use('/api/ordenes', pos, ordenes.router);
  app.use('/api/catalogos', pos, catalogos.router);
  app.use('/api/usuarios', pos, usuarios.router);
  app.use('/api/inventario', pos, inventario.router);
  app.use('/api/reportes', pos, reportes.router);

  app.use(notFound);
  app.use(c.middlewares.errorHandler);
  return app;
}

function isAllowedOrigin(origin: string | undefined, c: Container): boolean {
  if (!origin) return true; // curl, healthchecks, same-origin
  try {
    const url = new URL(origin);
    if (c.urls.isLocal()) return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const host = url.hostname.toLowerCase();
    if (host === `app.${c.env.APP_DOMAIN}` || host === c.env.APP_DOMAIN) return true;
    return c.urls.slugFromHost(host) !== null;
  } catch {
    return false;
  }
}
