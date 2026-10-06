import type { Clock } from '../../../shared/application/ports/Clock';
import type { EnviadorDeCorreo } from '../../../shared/application/ports/EnviadorDeCorreo';
import type { FileStorage } from '../../../shared/application/ports/FileStorage';
import type { IdentityProvider } from '../../../shared/application/ports/IdentityProvider';
import type { Logger } from '../../../shared/application/ports/Logger';
import type { TenantRepository } from '../../../shared/application/ports/TenantRepository';
import type { DomainUrls } from '../../../shared/config/domain';
import type { AuthInfo } from '../../../shared/domain/Auth';
import { ConflictError, ExternalServiceError, NotFoundError, ValidationError } from '../../../shared/domain/DomainError';
import type { TenantInfo } from '../../../shared/domain/Tenant';
import type { AvisosEnviados } from '../../../shared/application/ports/AvisosEnviados';
import { diasSinUso, situacion } from '../domain/resumen';
import { categoriaRetencion, correoRetencion, fechaDeArchivo, recuperableHasta, siguientePaso, ultimoUso } from '../domain/retencion';
import type { Bitacora, LecturaPlataforma } from './ResumenPlataforma';

export interface ResumenDeRetencion {
  revisados: number;
  avisos: number;
  archivados: number;
  sinDestinatario: number;
  fallidos: number;
}

/**
 * El trabajo diario del ciclo de inactividad: primer aviso, segundo aviso y archivado, en orden.
 *
 * No borra nunca: borrar lo aprueba el operador en la consola.
 */
export class RevisarInactividad {
  constructor(
    private readonly lectura: LecturaPlataforma,
    private readonly tenants: TenantRepository,
    private readonly avisos: AvisosEnviados,
    private readonly correosDeAdmins: (tenantId: string) => Promise<string[]>,
    private readonly enviador: EnviadorDeCorreo,
    private readonly urls: DomainUrls,
    private readonly clock: Clock,
    private readonly timeZone: string,
    private readonly logger: Logger,
    private readonly onTenantChanged?: (tenant: TenantInfo) => void,
  ) {}

  async ejecutar(): Promise<ResumenDeRetencion> {
    const ahora = this.clock.now();
    const r: ResumenDeRetencion = { revisados: 0, avisos: 0, archivados: 0, sinDestinatario: 0, fallidos: 0 };

    for (const t of await this.lectura.restaurantes(ahora)) {
      r.revisados += 1;
      const categoria = categoriaRetencion(situacion(t, ahora), t.tieneSuscripcionStripe);
      const dias = diasSinUso(t, ahora);
      const paso = siguientePaso({ categoria, diasSinUso: dias, archivadoAt: t.archivadoAt, pausada: t.retencionPausada, enviados: t.enviadosRetencion }, ahora);
      if (!paso || categoria === 'protegida') continue;
      const referencia = ultimoUso(t);

      // Un restaurante que falle no detiene a los demás.
      try {
        const para = await this.correosDeAdmins(t.id);
        if (paso === 'archivado') {
          const archivado = await this.tenants.setArchivado(t.id, ahora);
          this.onTenantChanged?.(archivado);
          r.archivados += 1;
        }
        const base = this.urls.tenantUrl(t.slug);
        const contenido = correoRetencion(paso, {
          nombreRestaurante: t.nombre,
          diasSinUso: dias,
          fecha: paso === 'archivado' ? recuperableHasta(ahora) : fechaDeArchivo(categoria, referencia, paso, ahora),
          urlEntrar: `${base}/`,
          urlReportes: `${base}/reportes`,
          timeZone: this.timeZone,
        });

        if (para.length > 0) {
          await this.enviador.enviar({ para, ...contenido });
        } else {
          // Sin a quién escribir el ciclo sigue: de lo contrario, una cuenta sin administradores
          // con correo no se archivaría nunca.
          r.sinDestinatario += 1;
          this.logger.warn('Paso de inactividad sin destinatario', { slug: t.slug, paso });
        }
        await this.avisos.registrar(t.id, paso, referencia, para.length > 0 ? para : ['(sin destinatario)']);
        if (paso !== 'archivado') r.avisos += 1;
        this.logger.info('Paso de inactividad aplicado', { slug: t.slug, paso, diasSinUso: dias, para });
      } catch (err) {
        r.fallidos += 1;
        this.logger.error('Falló el paso de inactividad; se reintenta en la próxima corrida', {
          slug: t.slug,
          paso,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return r;
  }
}

/**
 * Lo que el operador hace con la retención desde la consola —restaurar, pausar y aprobar el
 * borrado— y la recuperación que hace el propio restaurante. Todo lo del operador queda en la
 * bitácora.
 */
export class GestionRetencion {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly identity: IdentityProvider,
    private readonly storage: FileStorage,
    private readonly bitacora: Bitacora,
    private readonly clock: Clock,
    private readonly logger: Logger,
    private readonly correoDe: (userId: string) => Promise<string | null> = async () => null,
    private readonly onTenantChanged?: (tenant: Pick<TenantInfo, 'zitadelOrgId'>) => void,
  ) {}

  private async registrar(operador: AuthInfo, accion: string, detalle: Record<string, unknown>): Promise<void> {
    const email = operador.email || ((await this.correoDe(operador.userId).catch(() => null)) ?? '');
    await this.bitacora.registrar({ operadorId: operador.userId, operadorEmail: email, accion, detalle });
  }

  private async restaurante(id: string): Promise<TenantInfo> {
    const t = await this.tenants.findById(id);
    if (!t) throw new NotFoundError('Restaurante no encontrado', 'NO_ENCONTRADO');
    return t;
  }

  async restaurar(operador: AuthInfo, id: string): Promise<void> {
    const t = await this.restaurante(id);
    if (!t.archivadoAt) throw new ValidationError('El restaurante no está archivado', 'NO_ARCHIVADO');
    const restaurado = await this.tenants.setArchivado(id, null);
    this.onTenantChanged?.(restaurado);
    await this.registrar(operador, 'restaurar-restaurante', { slug: t.slug, archivadoAt: t.archivadoAt });
  }

  async pausar(operador: AuthInfo, id: string, pausada: boolean): Promise<void> {
    const t = await this.restaurante(id);
    await this.tenants.setRetencionPausada(id, pausada);
    await this.registrar(operador, pausada ? 'pausar-retencion' : 'reanudar-retencion', { slug: t.slug });
  }

  /**
   * Borra un restaurante para siempre. Solo archivado, pasado el plazo para recuperarlo, sin
   * suscripción viva y con su subdominio escrito para confirmar.
   */
  async borrar(operador: AuthInfo, id: string, confirmacion: unknown): Promise<void> {
    const t = await this.restaurante(id);
    const ahora = this.clock.now();
    if (t.planStatus === 'active' || t.planStatus === 'past_due') {
      throw new ConflictError('Un restaurante con plan activo no se borra', 'PROTEGIDO');
    }
    if (!t.archivadoAt) throw new ConflictError('Solo se borra un restaurante archivado', 'NO_ARCHIVADO');
    if (ahora.getTime() < recuperableHasta(t.archivadoAt).getTime()) {
      throw new ConflictError('Todavía está en su plazo para recuperarlo', 'AUN_RECUPERABLE');
    }
    if (confirmacion !== t.slug) throw new ValidationError('Escribe el subdominio del restaurante para confirmar', 'CONFIRMACION_INCORRECTA');
    await this.borrarDefinitivo(operador, t, 'borrar-restaurante');
  }

  /**
   * Borra un restaurante de prueba: uno que nunca pagó, sin esperar al archivado ni a sus 30 días.
   * Es para limpiar las pruebas; uno que paga, tiene pago pendiente, tiene un plan dado sin Stripe
   * o tuvo alguna vez una suscripción no entra, aunque esté cancelado.
   */
  async borrarPrueba(operador: AuthInfo, id: string, confirmacion: unknown): Promise<void> {
    const t = await this.restaurante(id);
    const tuvoSuscripcion = (await this.tenants.getStripeSubscriptionId(id)) !== null;
    const categoria = categoriaRetencion(situacion({ ...t, tieneSuscripcionStripe: tuvoSuscripcion }, this.clock.now()), tuvoSuscripcion);
    if (categoria !== 'prueba-sin-pago') {
      throw new ConflictError('Solo se borra así un restaurante que nunca pagó', 'NO_ES_PRUEBA');
    }
    if (confirmacion !== t.slug) throw new ValidationError('Escribe el subdominio del restaurante para confirmar', 'CONFIRMACION_INCORRECTA');
    await this.borrarDefinitivo(operador, t, 'borrar-restaurante-prueba');
  }

  /**
   * Primero la organización de Zitadel: si falla, no se ha borrado nada y se puede reintentar.
   * Después los archivos y al final los datos (en cascada). Los cobros siguen en Stripe.
   */
  private async borrarDefinitivo(operador: AuthInfo, t: TenantInfo, accion: string): Promise<void> {
    if (t.zitadelOrgId) {
      try {
        await this.identity.deleteOrganization(t.zitadelOrgId);
      } catch (err) {
        throw new ExternalServiceError(`No se pudo borrar la organización en Zitadel: ${err instanceof Error ? err.message : String(err)}`, 'ZITADEL');
      }
    }
    await this.storage.deleteTenantFiles(t.id).catch((err) => this.logger.warn('No se pudieron borrar los archivos', { slug: t.slug, err: String(err) }));
    await this.tenants.delete(t.id);
    this.onTenantChanged?.(t);
    await this.registrar(operador, accion, {
      slug: t.slug,
      nombre: t.nombre,
      plan: t.plan,
      planStatus: t.planStatus,
      archivadoAt: t.archivadoAt,
      zitadelOrgId: t.zitadelOrgId,
    });
    this.logger.info('Restaurante borrado por el operador', { slug: t.slug, accion, operador: operador.userId });
  }

  /** El administrador del propio restaurante lo recupera. Sin efecto si no está archivado. */
  async recuperarPorRestaurante(tenant: TenantInfo, quien: AuthInfo): Promise<void> {
    if (!tenant.archivadoAt) return;
    const restaurado = await this.tenants.setArchivado(tenant.id, null);
    this.onTenantChanged?.(restaurado);
    this.logger.info('Restaurante recuperado por su administrador', { slug: tenant.slug, usuario: quien.userId });
  }
}
