import { Router, type RequestHandler } from 'express';
import type { DomainUrls } from '../../../shared/config/domain';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { sendOk } from '../../../shared/http/express/respond';
import type { TenantRepository } from '../application/ports/TenantRepository';

export interface TenantsRouterDeps {
  tenants: TenantRepository;
  urls: DomainUrls;
  authenticate: RequestHandler;
  tenantContext: RequestHandler;
}

export function createTenantsRouter(deps: TenantsRouterDeps): Router {
  const router = Router();

  // Público: el SPA lo usa antes del login para conocer la org y el branding del restaurante.
  router.get(
    '/by-slug/:slug',
    asyncHandler(async (req, res) => {
      const slug = String(req.params.slug).toLowerCase();
      const tenant = deps.urls.isValidSlug(slug) ? await deps.tenants.findBySlug(slug) : null;
      if (!tenant || !tenant.activo) {
        res.status(404).json({ success: false, data: null, message: 'Restaurante no encontrado', code: 'TENANT_NOT_FOUND' });
        return;
      }
      sendOk(res, { slug: tenant.slug, nombre: tenant.nombre, orgId: tenant.zitadelOrgId, config: tenant.config, url: deps.urls.tenantUrl(tenant.slug) });
    }),
  );

  // Público: disponibilidad de slug para el wizard de registro.
  router.get(
    '/check-slug/:slug',
    asyncHandler(async (req, res) => {
      const slug = String(req.params.slug).toLowerCase();
      if (!deps.urls.isValidSlug(slug)) {
        sendOk(res, { slug, available: false, reason: deps.urls.isReservedSlug(slug) ? 'reserved' : 'invalid' });
        return;
      }
      const existing = await deps.tenants.findBySlug(slug);
      sendOk(res, { slug, available: existing === null, url: deps.urls.tenantUrl(slug) });
    }),
  );

  // Autenticado: tenant y usuario actual.
  router.get(
    '/me',
    deps.authenticate,
    deps.tenantContext,
    asyncHandler(async (req, res) => {
      const tenant = req.tenant!;
      const auth = req.auth!;
      sendOk(res, {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          nombre: tenant.nombre,
          plan: tenant.plan,
          planStatus: tenant.planStatus,
          trialEndsAt: tenant.trialEndsAt,
          maxUsuarios: tenant.maxUsuarios,
          activo: tenant.activo,
          config: tenant.config,
          url: deps.urls.tenantUrl(tenant.slug),
        },
        user: {
          id: auth.userId,
          email: auth.email,
          nombre: auth.name,
          role: auth.primaryRole,
          roles: auth.roles,
        },
      });
    }),
  );

  return router;
}
