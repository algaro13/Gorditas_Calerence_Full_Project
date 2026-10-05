import { Router, type RequestHandler } from 'express';
import Joi from 'joi';
import type { DomainUrls } from '../../../shared/config/domain';
import { asyncHandler } from '../../../shared/http/express/async-handler';
import { isAdmin } from '../../../shared/http/express/authenticate';
import { sendError, sendOk } from '../../../shared/http/express/respond';
import { singleImageUpload } from '../../../shared/http/express/upload';
import { validateBody } from '../../../shared/http/express/validate';
import type { TenantRepository } from '../../../shared/application/ports/TenantRepository';
import type { IdentityProvider } from '../../../shared/application/ports/IdentityProvider';
import type { VerificadorDeCorreo } from '../../../shared/http/express/email-verificado';
import type { ActualizarConfigTenant, SubirLogoTenant } from '../application/use-cases/ConfiguracionTenant';
import { accessBlockReason, DIAS_PARA_RECUPERAR, PALETAS } from '../../../shared/domain/Tenant';
import type { Clock } from '../../../shared/application/ports/Clock';
import type { TenantInfo } from '../../../shared/domain/Tenant';
import type { AuthInfo } from '../../../shared/domain/Auth';

export interface TenantsRouterDeps {
  tenants: TenantRepository;
  urls: DomainUrls;
  authenticate: RequestHandler;
  tenantContext: RequestHandler;
  /** Exige el correo confirmado; se aplica solo a lo que modifica datos. */
  emailVerificado: RequestHandler;
  verificador: VerificadorDeCorreo;
  identity: IdentityProvider;
  actualizarConfig: ActualizarConfigTenant;
  subirLogo: SubirLogoTenant;
  /**
   * La zona horaria del negocio, la misma con la que los reportes cortan el dia.
   *
   * El SPA la necesita para saber que dia es «hoy». Calculandolo por su cuenta en UTC pedia el
   * dia siguiente desde las 18:00 en Mexico, y el reporte de la cena salia en ceros.
   */
  timeZone: string;
  clock: Clock;
  /** El administrador recupera su restaurante archivado por falta de uso. */
  recuperar: (tenant: TenantInfo, auth: AuthInfo) => Promise<void>;
}

const configSchema = Joi.object({
  paleta: Joi.string()
    .valid(...PALETAS)
    .optional(),
  imagen: Joi.string().max(300).allow('', null).optional(),
}).min(1);

export function createTenantsRouter(deps: TenantsRouterDeps): Router {
  const router = Router();

  // Público: el SPA lo usa antes del login para conocer la org y el branding del restaurante.
  router.get(
    '/by-slug/:slug',
    asyncHandler(async (req, res) => {
      const slug = String(req.params.slug).toLowerCase();
      const tenant = deps.urls.isValidSlug(slug) ? await deps.tenants.findBySlug(slug) : null;
      if (!tenant || !tenant.activo) {
        sendError(res, 404, 'Restaurante no encontrado', 'TENANT_NOT_FOUND');
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
      const emailVerificado = await deps.verificador.estaVerificado(auth.userId);
      sendOk(res, {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          nombre: tenant.nombre,
          plan: tenant.plan,
          planStatus: tenant.planStatus,
          trialEndsAt: tenant.trialEndsAt,
          currentPeriodEnd: tenant.currentPeriodEnd,
          cancelAt: tenant.cancelAt,
          maxUsuarios: tenant.maxUsuarios,
          activo: tenant.activo,
          archivadoAt: tenant.archivadoAt,
          recuperableHasta: tenant.archivadoAt ? new Date(tenant.archivadoAt.getTime() + DIAS_PARA_RECUPERAR * 86_400_000) : null,
          config: tenant.config,
          url: deps.urls.tenantUrl(tenant.slug),
        },
        user: {
          id: auth.userId,
          email: auth.email,
          nombre: auth.name,
          role: auth.primaryRole,
          roles: auth.roles,
          emailVerificado,
        },
        zonaHoraria: deps.timeZone,
        // Si el plan no deja operar, y por que. Lo decide el mismo codigo que bloquea las rutas
        // de negocio: si el SPA se lo inventara, tarde o temprano diria una cosa distinta de la
        // que hace el backend. Sin esto, el SPA recibia un 403 en cada pantalla, se quedaba con
        // la lista vacia y no decia nada: el restaurante veia un sistema roto en vez de un
        // aviso de que su prueba habia terminado.
        accesoBloqueado: accessBlockReason(tenant, deps.clock.now()),
      });
    }),
  );

  router.put(
    '/me/config',
    deps.authenticate,
    deps.tenantContext,
    deps.emailVerificado,
    isAdmin,
    validateBody(configSchema, { stripUnknown: true }),
    asyncHandler(async (req, res) => {
      const config = await deps.actualizarConfig.execute(req.tenant!, req.body);
      sendOk(res, { config }, 'Configuración actualizada');
    }),
  );

  router.post(
    '/me/logo',
    deps.authenticate,
    deps.tenantContext,
    deps.emailVerificado,
    isAdmin,
    singleImageUpload('image'),
    asyncHandler(async (req, res) => {
      if (!req.file) {
        sendError(res, 400, 'No se recibió imagen', 'NO_IMAGE');
        return;
      }
      const result = await deps.subirLogo.execute(req.tenant!, { buffer: req.file.buffer, mimeType: req.file.mimetype, size: req.file.size });
      sendOk(res, result, 'Logo actualizado');
    }),
  );

  // Sin el guard de plan: es justo lo que necesita un restaurante archivado.
  router.post(
    '/me/recuperar',
    deps.authenticate,
    deps.tenantContext,
    isAdmin,
    asyncHandler(async (req, res) => {
      await deps.recuperar(req.tenant!, req.auth!);
      sendOk(res, { recuperado: true }, 'Tu restaurante está de vuelta.');
    }),
  );

  // Reenvío del correo de verificación. No lleva el guard: es justo lo que necesita quien no
  // ha confirmado todavía.
  router.post(
    '/me/reenviar-verificacion',
    deps.authenticate,
    asyncHandler(async (req, res) => {
      const userId = req.auth!.userId;
      await deps.identity.resendEmailVerification(userId);
      deps.verificador.olvidar(userId);
      sendOk(res, null, 'Te enviamos un correo nuevo para confirmar tu dirección.');
    }),
  );

  return router;
}
