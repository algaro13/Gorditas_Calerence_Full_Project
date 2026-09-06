import type { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { Clock } from '../../shared/application/ports/Clock';
import type { FileStorage } from '../../shared/application/ports/FileStorage';
import type { IdentityProvider } from '../../shared/application/ports/IdentityProvider';
import type { Logger } from '../../shared/application/ports/Logger';
import type { TenantRepository } from '../../shared/application/ports/TenantRepository';
import type { DomainUrls } from '../../shared/config/domain';
import type { TenantInfo } from '../../shared/domain/Tenant';
import { RegistrarRestaurante } from './application/use-cases/RegistrarRestaurante';
import { createOnboardingRouter } from './http/onboarding.router';
import { PrismaTenantProvisioner } from './infrastructure/PrismaTenantProvisioner';

export interface OnboardingModuleDeps {
  prisma: PrismaClient;
  tenants: TenantRepository;
  identity: IdentityProvider;
  storage: FileStorage;
  urls: DomainUrls;
  clock: Clock;
  logger: Logger;
  rateLimitEnabled: boolean;
  onProvisioned?: (tenant: TenantInfo) => void;
}

export function createOnboardingModule(deps: OnboardingModuleDeps): { router: Router; registrar: RegistrarRestaurante } {
  const provisioner = new PrismaTenantProvisioner(deps.prisma);
  const registrar = new RegistrarRestaurante(deps.tenants, deps.identity, provisioner, deps.storage, deps.urls, deps.clock, deps.logger, deps.onProvisioned);
  return { router: createOnboardingRouter({ registrar, storage: deps.storage, rateLimitEnabled: deps.rateLimitEnabled }), registrar };
}
