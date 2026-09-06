import type { Clock } from '../../../../shared/application/ports/Clock';
import type { FileStorage } from '../../../../shared/application/ports/FileStorage';
import type { IdentityProvider } from '../../../../shared/application/ports/IdentityProvider';
import type { Logger } from '../../../../shared/application/ports/Logger';
import type { TenantRepository } from '../../../../shared/application/ports/TenantRepository';
import type { DomainUrls } from '../../../../shared/config/domain';
import { ConflictError, DomainError, ExternalServiceError, ValidationError } from '../../../../shared/domain/DomainError';
import { PALETAS, TRIAL_DAYS, TRIAL_MAX_USUARIOS, type TenantInfo } from '../../../../shared/domain/Tenant';
import type { TenantProvisioner } from '../ports/TenantProvisioner';

export interface RegistrarRestauranteInput {
  admin: { nombre: string; apellido: string; email: string; password: string };
  nombre: string;
  slug: string;
  paleta?: string;
  imagen?: string | null;
  mesas?: Array<{ nombre: string }>;
  platillos?: Array<{ nombre: string; precio: number }>;
  guisos?: Array<{ nombre: string }>;
}

export interface RegistrarRestauranteResult {
  tenant: TenantInfo;
  url: string;
  user: { email: string; role: 'Admin' };
}

export class OnboardingFailedError extends DomainError {
  readonly status = 500;
  constructor(detail: string) {
    super('Error al completar el registro', 'ONBOARDING_FAILED', { detail });
  }
}

/**
 * Registro público: organización + admin en el proveedor de identidad, tenant en la base y catálogo inicial.
 * Si la parte de base falla, se elimina la organización (best effort) para dejar el slug libre.
 */
export class RegistrarRestaurante {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly identity: IdentityProvider,
    private readonly provisioner: TenantProvisioner,
    private readonly storage: FileStorage,
    private readonly urls: DomainUrls,
    private readonly clock: Clock,
    private readonly logger: Logger,
    private readonly onProvisioned?: (tenant: TenantInfo) => void,
  ) {}

  async execute(input: RegistrarRestauranteInput): Promise<RegistrarRestauranteResult> {
    const slug = input.slug.trim().toLowerCase();
    if (!this.urls.isValidSlug(slug)) {
      throw new ValidationError(
        this.urls.isReservedSlug(slug) ? 'Ese nombre está reservado' : 'Slug inválido. Use 3-50 caracteres, solo letras minúsculas, números y guiones.',
        'SLUG_INVALIDO',
      );
    }
    const paleta = input.paleta ?? 'orange';
    if (!(PALETAS as readonly string[]).includes(paleta)) throw new ValidationError('Paleta no válida', 'PALETA_INVALIDA');
    if (await this.tenants.findBySlug(slug)) throw new ConflictError('Este nombre ya está en uso', 'SLUG_OCUPADO');

    const email = input.admin.email.trim().toLowerCase();
    const nombreAdmin = `${input.admin.nombre.trim()} ${input.admin.apellido.trim()}`.trim();

    // 1) Identidad
    let orgId: string;
    let userId: string;
    try {
      ({ orgId, userId } = await this.identity.createOrganizationWithAdmin({
        name: input.nombre.trim(),
        admin: { givenName: input.admin.nombre.trim(), familyName: input.admin.apellido.trim(), email, password: input.admin.password },
      }));
    } catch (err) {
      if (err instanceof ExternalServiceError) {
        const status = (err.details as { status?: number } | undefined)?.status;
        if (status === 409) throw new ConflictError('Ya existe un negocio registrado con ese nombre o correo', 'NEGOCIO_DUPLICADO');
        throw new ValidationError('No se pudo crear la cuenta. Verifica el correo y que la contraseña tenga mayúscula, minúscula, número y símbolo.', 'PASSWORD_POLICY');
      }
      throw err;
    }

    try {
      const { projectGrantId } = await this.identity.grantProjectToOrganization(orgId);
      await this.identity.assignRole({ orgId, userId, projectGrantId, role: 'Admin' });
      await this.identity.registerRedirectUris({ redirect: [this.urls.tenantCallbackUrl(slug)], postLogout: [this.urls.tenantUrl(slug)] });

      // 2) Base de datos
      const trialEndsAt = new Date(this.clock.now().getTime() + TRIAL_DAYS * 86_400_000);
      let tenant = await this.tenants.create({
        slug,
        nombre: input.nombre.trim(),
        zitadelOrgId: orgId,
        zitadelProjectGrantId: projectGrantId,
        trialEndsAt,
        maxUsuarios: TRIAL_MAX_USUARIOS,
        config: { paleta, imagen: null },
      });

      try {
        await this.provisioner.provision({
          tenantId: tenant.id,
          admin: { zitadelUserId: userId, email, nombre: nombreAdmin },
          mesas: input.mesas ?? [],
          platillos: input.platillos ?? [],
          guisos: input.guisos ?? [],
        });
      } catch (err) {
        await this.tenants.delete(tenant.id).catch(() => undefined);
        throw err;
      }

      // 3) Logo temporal → carpeta del tenant (no bloquea el registro)
      if (input.imagen) {
        const promoted = await this.storage.promoteTemporaryLogo(input.imagen, tenant.id);
        if (promoted) tenant = await this.tenants.updateConfig(tenant.id, { ...tenant.config, imagen: promoted.url });
      }
      await this.tenants.setProvisioningStatus(tenant.id, 'ready');
      this.onProvisioned?.(tenant);
      this.logger.info('Restaurante registrado', { tenantId: tenant.id, slug, orgId });
      return { tenant, url: this.urls.tenantUrl(slug), user: { email, role: 'Admin' } };
    } catch (err) {
      this.logger.error('Onboarding falló; eliminando organización', { slug, orgId, err: String(err) });
      await this.identity.deleteOrganization(orgId).catch((e) => this.logger.warn('No se pudo eliminar la organización', { orgId, err: String(e) }));
      if (err instanceof DomainError) throw err;
      throw new OnboardingFailedError(err instanceof Error ? err.message : String(err));
    }
  }
}
