import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthInfo } from '../../domain/Auth';
import type { TenantInfo } from '../../domain/Tenant';
import { NoTenantContextError } from '../../domain/DomainError';

export interface TenantContext {
  tenant: TenantInfo;
  auth: AuthInfo;
}

const tenantStore = new AsyncLocalStorage<TenantContext>();

/** Ejecuta `fn` con el contexto de tenant disponible para todo el árbol asíncrono. */
export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return tenantStore.run(ctx, fn);
}

export function getTenantContext(): TenantContext {
  const ctx = tenantStore.getStore();
  if (!ctx) throw new NoTenantContextError();
  return ctx;
}

export function tryGetTenantContext(): TenantContext | undefined {
  return tenantStore.getStore();
}
