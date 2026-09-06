import type { RequestHandler } from 'express';
import type { AuthInfo } from '../../domain/Auth';
import type { TenantInfo } from '../../domain/Tenant';
import type { Logger } from '../../application/ports/Logger';
import { runWithTenant } from '../../infrastructure/prisma/tenant-context';
import { sendError } from './respond';

export interface TenantContextDeps {
  findTenantByOrgId: (orgId: string) => Promise<TenantInfo | null>;
  /** Se invoca (con throttle) cuando un miembro autenticado hace una request. */
  onMemberSeen?: (tenant: TenantInfo, auth: AuthInfo) => Promise<void>;
  logger: Logger;
  cacheTtlMs?: number;
  memberThrottleMs?: number;
}

interface CacheEntry {
  tenant: TenantInfo | null;
  expiresAt: number;
}

export interface TenantContextMiddleware extends RequestHandler {
  invalidate(orgId?: string): void;
}

/**
 * Resuelve el tenant a partir de la organización del token, lo expone en `req.tenant`
 * y ejecuta el resto de la cadena dentro del contexto (AsyncLocalStorage).
 */
export function createTenantContext(deps: TenantContextDeps): TenantContextMiddleware {
  const ttl = deps.cacheTtlMs ?? 60_000;
  const memberThrottle = deps.memberThrottleMs ?? 5 * 60_000;
  const cache = new Map<string, CacheEntry>();
  const seen = new Map<string, number>();

  async function resolve(orgId: string): Promise<TenantInfo | null> {
    const now = Date.now();
    const hit = cache.get(orgId);
    if (hit && hit.expiresAt > now) return hit.tenant;
    const tenant = await deps.findTenantByOrgId(orgId);
    cache.set(orgId, { tenant, expiresAt: now + (tenant ? ttl : Math.min(ttl, 5_000)) });
    return tenant;
  }

  const middleware: RequestHandler = async (req, res, next) => {
    const auth = req.auth;
    if (!auth) {
      sendError(res, 401, 'No autenticado', 'UNAUTHORIZED');
      return;
    }
    let tenant: TenantInfo | null;
    try {
      tenant = await resolve(auth.orgId);
    } catch (err) {
      next(err);
      return;
    }
    if (!tenant) {
      sendError(res, 404, 'Tu cuenta no tiene un restaurante configurado. Completa el registro.', 'NO_TENANT');
      return;
    }
    if (!tenant.activo) {
      sendError(res, 403, 'Cuenta suspendida. Contacta a soporte.', 'TENANT_INACTIVE');
      return;
    }
    req.tenant = tenant;

    if (deps.onMemberSeen) {
      const key = `${tenant.id}:${auth.userId}`;
      const last = seen.get(key) ?? 0;
      if (Date.now() - last > memberThrottle) {
        seen.set(key, Date.now());
        deps.onMemberSeen(tenant, auth).catch((err) => deps.logger.warn('onMemberSeen falló', { err: String(err), tenantId: tenant!.id }));
      }
    }

    runWithTenant({ tenant, auth }, () => next());
  };

  const withInvalidate = middleware as TenantContextMiddleware;
  withInvalidate.invalidate = (orgId?: string) => {
    if (orgId) cache.delete(orgId);
    else cache.clear();
  };
  return withInvalidate;
}
