import type { FileStorage, UploadedImage } from '../../../../shared/application/ports/FileStorage';
import { ValidationError } from '../../../../shared/domain/DomainError';
import { PALETAS, type TenantConfig, type TenantInfo } from '../../../../shared/domain/Tenant';
import type { TenantRepository } from '../../../../shared/application/ports/TenantRepository';


export interface ActualizarConfigInput {
  paleta?: string;
  imagen?: string | null;
}

export class ActualizarConfigTenant {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly storage: FileStorage,
    private readonly onChanged?: (tenant: TenantInfo) => void,
  ) {}

  async execute(tenant: TenantInfo, input: ActualizarConfigInput): Promise<TenantConfig> {
    const config: TenantConfig = { ...tenant.config };
    if (input.paleta !== undefined) {
      if (!(PALETAS as readonly string[]).includes(input.paleta)) throw new ValidationError('Paleta no válida', 'PALETA_INVALIDA');
      config.paleta = input.paleta;
    }
    if (input.imagen !== undefined) {
      if (input.imagen === null || input.imagen === '') {
        config.imagen = null;
      } else if (this.storage.isTenantUrl(input.imagen, tenant.id)) {
        config.imagen = input.imagen;
      } else {
        // Compatibilidad con el flujo del wizard: url temporal que aún no se ha promovido
        const promoted = await this.storage.promoteTemporaryLogo(input.imagen, tenant.id);
        if (!promoted) throw new ValidationError('Imagen no válida para este restaurante', 'IMAGEN_INVALIDA');
        config.imagen = promoted.url;
      }
    }
    const updated = await this.tenants.updateConfig(tenant.id, config);
    this.onChanged?.(updated);
    return updated.config;
  }
}

export class SubirLogoTenant {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly storage: FileStorage,
    private readonly onChanged?: (tenant: TenantInfo) => void,
  ) {}

  async execute(tenant: TenantInfo, file: UploadedImage): Promise<{ url: string; config: TenantConfig }> {
    const stored = await this.storage.saveTenantLogo(tenant.id, file);
    const updated = await this.tenants.updateConfig(tenant.id, { ...tenant.config, imagen: stored.url });
    this.onChanged?.(updated);
    return { url: stored.url, config: updated.config };
  }
}
