/**
 * Composition root: construye adaptadores, puertos y middlewares con inyección manual.
 * Todo lo que necesite sustituirse en pruebas se pasa por `overrides`.
 */
import type { PrismaClient } from '@prisma/client';
import { createLocalJWKSet, createRemoteJWKSet, type JSONWebKeySet, type JWTVerifyGetKey } from 'jose';
import type { RequestHandler, ErrorRequestHandler } from 'express';
import type { Logger as PinoLogger } from 'pino';
import { env as defaultEnv, type Env } from './shared/config/env';
import { createDomainUrls, type DomainUrls } from './shared/config/domain';
import type { Clock } from './shared/application/ports/Clock';
import type { FileStorage } from './shared/application/ports/FileStorage';
import type { IdentityProvider } from './shared/application/ports/IdentityProvider';
import type { Logger } from './shared/application/ports/Logger';
import type { PaymentProvider, WebhookVerifier } from './shared/application/ports/PaymentProvider';
import type { UnitOfWork } from './shared/application/ports/UnitOfWork';
import { createPrismaClient } from './shared/infrastructure/prisma/client';
import { PrismaUnitOfWork } from './shared/infrastructure/prisma/unit-of-work';
import { createLogger } from './shared/infrastructure/logger/pino-logger';
import { SystemClock } from './shared/infrastructure/clock/SystemClock';
import { LocalFileStorage } from './shared/infrastructure/storage/LocalFileStorage';
import { createAuthenticate } from './shared/http/express/authenticate';
import { createTenantContext, type TenantContextMiddleware } from './shared/http/express/tenant-context';
import { createEmailVerificadoGuard, createVerificadorDeCorreo, type VerificadorDeCorreo } from './shared/http/express/email-verificado';
import { createPlanGuard } from './shared/http/express/plan-guard';
import { createErrorHandler } from './shared/http/express/error-handler';
import { ZitadelIdentityProvider } from './infrastructure/zitadel/ZitadelIdentityProvider';
import { FakeIdentityProvider } from './infrastructure/zitadel/FakeIdentityProvider';
import { createStripeClient, StripePaymentProvider, StripeWebhookVerifier } from './infrastructure/stripe/StripePaymentProvider';
import { FakePaymentProvider } from './infrastructure/stripe/FakePaymentProvider';
import { PrismaTenantRepository } from './modules/tenants/infrastructure/PrismaTenantRepository';
import type { TenantRepository } from './shared/application/ports/TenantRepository';
import { touchMember } from './modules/usuarios/infrastructure/member-mirror';
import type { BillingConfig } from './modules/billing/application/use-cases/Billing';
import type { PaidPlanId } from './modules/billing/domain/plans';

export interface ContainerOverrides {
  env?: Partial<Env>;
  prisma?: PrismaClient;
  clock?: Clock;
  logger?: Logger;
  identityProvider?: IdentityProvider;
  paymentProvider?: PaymentProvider;
  webhookVerifier?: WebhookVerifier;
  storage?: FileStorage;
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
  verificadorDeCorreo: VerificadorDeCorreo;
  paymentProvider: PaymentProvider;
  webhookVerifier: WebhookVerifier;
  storage: FileStorage;
  billingConfig: BillingConfig;
  tenants: TenantRepository;
  middlewares: {
    authenticate: RequestHandler;
    tenantContext: TenantContextMiddleware;
    planGuard: RequestHandler;
    emailVerificado: RequestHandler;
    errorHandler: ErrorRequestHandler;
  };
  shutdown(): Promise<void>;
}

class UnverifiedWebhook implements WebhookVerifier {
  construct(): never {
    throw new Error('Webhook de pagos no configurado (STRIPE_WEBHOOK_SECRET)');
  }
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
  const urls = createDomainUrls({
    appDomain: env.APP_DOMAIN,
    scheme: env.APP_SCHEME,
    localFrontendOrigin: env.FRONTEND_BASE_URL,
    platformHost: env.APP_PLATFORM_HOST,
  });
  const storage = overrides.storage ?? new LocalFileStorage(env.UPLOADS_DIR);

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

  const stripe = env.PAYMENT_PROVIDER === 'stripe' && env.STRIPE_SECRET_KEY ? createStripeClient(env.STRIPE_SECRET_KEY) : null;
  const paymentProvider: PaymentProvider = overrides.paymentProvider ?? (stripe ? new StripePaymentProvider(stripe) : new FakePaymentProvider());
  const webhookVerifier: WebhookVerifier =
    overrides.webhookVerifier ??
    (env.STRIPE_WEBHOOK_SECRET ? new StripeWebhookVerifier(stripe ?? createStripeClient('sk_test_placeholder'), env.STRIPE_WEBHOOK_SECRET) : new UnverifiedWebhook());

  const priceIds: Partial<Record<PaidPlanId, string>> = {
    ...(env.STRIPE_PRICE_BASICO ? { basico: env.STRIPE_PRICE_BASICO } : {}),
    ...(env.STRIPE_PRICE_PROFESIONAL ? { profesional: env.STRIPE_PRICE_PROFESIONAL } : {}),
    ...(env.STRIPE_PRICE_EMPRESARIAL ? { empresarial: env.STRIPE_PRICE_EMPRESARIAL } : {}),
  };
  const billingConfig: BillingConfig = {
    priceIds,
    priceToPlan: Object.fromEntries(Object.entries(priceIds).map(([plan, price]) => [price, plan as PaidPlanId])),
  };

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
  const verificadorDeCorreo = createVerificadorDeCorreo(identityProvider, clock);
  const emailVerificado = createEmailVerificadoGuard(verificadorDeCorreo);
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
    verificadorDeCorreo,
    paymentProvider,
    webhookVerifier,
    storage,
    billingConfig,
    tenants,
    middlewares: { authenticate, tenantContext, planGuard, emailVerificado, errorHandler },
    shutdown: async () => {
      await prisma.$disconnect();
    },
  };
}
