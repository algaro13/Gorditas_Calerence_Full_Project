import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import type { Container } from './container';
import { notFound } from './shared/http/express/error-handler';
import { createTenantsRouter } from './modules/tenants/http/tenants.router';

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

  const { authenticate, tenantContext } = c.middlewares;
  app.use('/api/tenants', createTenantsRouter({ tenants: c.tenants, urls: c.urls, authenticate, tenantContext }));

  // Rutas de negocio (ordenes, catalogos, inventario, reportes, usuarios, onboarding, billing)
  // se montan en los changes siguientes sobre [authenticate, tenantContext, planGuard].

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
