/**
 * Composition root: construye adaptadores, puertos y middlewares con inyección manual.
 * Todo lo que necesite sustituirse en pruebas se pasa por `overrides`.
 */
import type { PrismaClient } from '@prisma/client';
import { createLocalJWKSet, createRemoteJWKSet, type JSONWebKeySet, type JWTVerifyGetKey } from 'jose';
import { env as defaultEnv, type Env } from './shared/config/env';
import { createDomainUrls, type DomainUrls } from './shared/config/domain';
import type { Clock } from './shared/application/ports/Clock';
import type { IdentityProvider } from './shared/application/ports/IdentityProvider';
import type { Logger } from './shared/application/ports/Logger';
import type { UnitOfWork } from './shared/application/ports/UnitOfWork';
import { createPrismaClient } from './shared/infrastructure/prisma/client';
import { PrismaUnitOfWork } from './shared/infrastructure/prisma/unit-of-work';
import { createLogger } from './shared/infrastructure/logger/pino-logger';
import { SystemClock } from './shared/infrastructure/clock/SystemClock';
import { createAuthenticate } from './shared/http/express/authenticate';
import { createTenantContext, type TenantContextMiddleware } from './shared/http/express/tenant-context';
import { createPlanGuard } from './shared/http/express/plan-guard';
import { createErrorHandler } from './shared/http/express/error-handler';
import { ZitadelIdentityProvider } from './infrastructure/zitadel/ZitadelIdentityProvider';
import { FakeIdentityProvider } from './infrastructure/zitadel/FakeIdentityProvider';
import { PrismaTenantRepository } from './modules/tenants/infrastructure/PrismaTenantRepository';
import type { TenantRepository } from './modules/tenants/application/ports/TenantRepository';
import { touchMember } from './modules/usuarios/infrastructure/member-mirror';
import type { RequestHandler, ErrorRequestHandler } from 'express';
import type { Logger as PinoLogger } from 'pino';

export interface ContainerOverrides {
  env?: Partial<Env>;
  prisma?: PrismaClient;
  clock?: Clock;
  logger?: Logger;
  identityProvider?: IdentityProvider;
  /** JWKS local (pruebas). Si se pasa, ignora ZITADEL_JWKS_MODE. */
  localJwks?: JSONWebKeySet;
  silentLogs?: boolean;
}

export interface Container {
  env: Env;
  urls: DomainUrls;
  logger: Logger;
  pino: PinoLogger;
  prisma: PrismaClient;
  clock: Clock;
  uow: UnitOfWork;
  identityProvider: IdentityProvider;
  tenants: TenantRepository;
  middlewares: {
    authenticate: RequestHandler;
    tenantContext: TenantContextMiddleware;
    planGuard: RequestHandler;
    errorHandler: ErrorRequestHandler;
  };
  shutdown(): Promise<void>;
}

export function buildContainer(overrides: ContainerOverrides = {}): Container {
  const env: Env = { ...defaultEnv, ...(overrides.env ?? {}) };
  const isProd = env.NODE_ENV === 'production';

  const { logger: builtLogger, pino } = createLogger({
    level: env.LOG_LEVEL,
    pretty: !isProd && env.NODE_ENV !== 'test',
    silent: overrides.silentLogs ?? env.NODE_ENV === 'test',
  });
  const logger = overrides.logger ?? builtLogger;
  const clock = overrides.clock ?? new SystemClock();
  const prisma = overrides.prisma ?? createPrismaClient({ url: env.DATABASE_URL, logQueries: false });
  const uow = new PrismaUnitOfWork(prisma);
  const urls = createDomainUrls({ appDomain: env.APP_DOMAIN, scheme: env.APP_SCHEME, localFrontendOrigin: env.FRONTEND_BASE_URL });

  const identityProvider: IdentityProvider =
    overrides.identityProvider ??
    (env.IDENTITY_PROVIDER === 'fake'
      ? new FakeIdentityProvider()
      : new ZitadelIdentityProvider(
          {
            apiUrl: env.ZITADEL_API_URL,
            pat: env.ZITADEL_PAT!,
            projectId: env.ZITADEL_PROJECT_ID,
            defaultOrgId: env.ZITADEL_DEFAULT_ORG_ID,
            spaAppId: env.ZITADEL_SPA_APP_ID,
          },
          logger.child({ component: 'zitadel' }),
        ));

  const tenants = new PrismaTenantRepository(prisma);

  const jwks: JWTVerifyGetKey = overrides.localJwks
    ? createLocalJWKSet(overrides.localJwks)
    : env.ZITADEL_JWKS_MODE === 'local'
      ? createLocalJWKSet({ keys: [] })
      : createRemoteJWKSet(new URL(env.ZITADEL_JWKS_URL));

  const authenticate = createAuthenticate({
    issuer: env.ZITADEL_ISSUER,
    audience: env.ZITADEL_AUDIENCE,
    projectId: env.ZITADEL_PROJECT_ID,
    jwks,
  });

  const tenantContext = createTenantContext({
    findTenantByOrgId: (orgId) => tenants.findByOrgId(orgId),
    onMemberSeen: (tenant, auth) => touchMember(prisma, tenant, auth, clock.now()),
    logger: logger.child({ component: 'tenant-context' }),
    cacheTtlMs: env.NODE_ENV === 'test' ? 0 : 60_000,
  });

  const planGuard = createPlanGuard({ clock });
  const errorHandler = createErrorHandler({ logger: logger.child({ component: 'http' }), exposeStack: !isProd });

  return {
    env,
    urls,
    logger,
    pino,
    prisma,
    clock,
    uow,
    identityProvider,
    tenants,
    middlewares: { authenticate, tenantContext, planGuard, errorHandler },
    shutdown: async () => {
      await prisma.$disconnect();
    },
  };
}
