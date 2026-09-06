import type { PrismaClient } from '@prisma/client';
import type { RequestHandler, Router } from 'express';
import type { Logger } from '../../shared/application/ports/Logger';
import type { PaymentProvider, WebhookVerifier } from '../../shared/application/ports/PaymentProvider';
import type { DomainUrls } from '../../shared/config/domain';
import type { TenantInfo } from '../../shared/domain/Tenant';
import type { TenantRepository } from '../../shared/application/ports/TenantRepository';
import { CrearCheckout, CrearPortal, EstadoBilling, ProcesarWebhook, type BillingConfig } from './application/use-cases/Billing';
import { createBillingRouter, createBillingWebhookHandler, type BillingUseCases } from './http/billing.router';
import { PrismaStripeEventStore } from './infrastructure/PrismaStripeEventStore';

export interface BillingModuleDeps {
  prisma: PrismaClient;
  tenants: TenantRepository;
  payments: PaymentProvider;
  verifier: WebhookVerifier;
  urls: DomainUrls;
  config: BillingConfig;
  logger: Logger;
  authenticate: RequestHandler;
  tenantContext: RequestHandler;
  onTenantChanged?: (tenant: TenantInfo) => void;
}

export function createBillingModule(deps: BillingModuleDeps): { router: Router; webhookHandler: RequestHandler; useCases: BillingUseCases } {
  const events = new PrismaStripeEventStore(deps.prisma);
  const useCases: BillingUseCases = {
    crearCheckout: new CrearCheckout(deps.tenants, deps.payments, deps.urls, deps.config),
    crearPortal: new CrearPortal(deps.tenants, deps.payments, deps.urls),
    estado: new EstadoBilling(deps.tenants),
    webhook: new ProcesarWebhook(deps.verifier, events, deps.tenants, deps.payments, deps.config, deps.logger, deps.onTenantChanged),
  };
  return {
    router: createBillingRouter(useCases, { authenticate: deps.authenticate, tenantContext: deps.tenantContext }),
    webhookHandler: createBillingWebhookHandler(useCases),
    useCases,
  };
}
