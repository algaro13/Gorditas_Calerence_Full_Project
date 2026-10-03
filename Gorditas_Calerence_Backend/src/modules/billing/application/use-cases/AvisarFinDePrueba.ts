import type { Clock } from '../../../../shared/application/ports/Clock';
import type { EnviadorDeCorreo } from '../../../../shared/application/ports/EnviadorDeCorreo';
import type { Logger } from '../../../../shared/application/ports/Logger';
import type { TenantRepository } from '../../../../shared/application/ports/TenantRepository';
import type { DomainUrls } from '../../../../shared/config/domain';
import { avisoQueToca, correoFinDePrueba } from '../../domain/aviso-prueba';
import type { AvisosEnviados } from '../ports/AvisosEnviados';

/** Correos de los administradores activos de un restaurante, solo los reales. */
export type CorreosDeAdmins = (tenantId: string) => Promise<string[]>;

export interface ResumenDeAvisos {
  revisados: number;
  enviados: number;
  /** Les tocaba aviso pero no tienen ningún administrador con correo real. */
  sinDestinatario: number;
  fallidos: number;
}

/**
 * Avisa por correo que la prueba se acaba (3 días antes) y que terminó (hasta 7 días después).
 *
 * La prueba la maneja la app, no Stripe, así que nadie más lo avisa. El panel lo dice, pero solo
 * a quien entra: un administrador que deja de abrir el sistema se enteraba cuando el punto de
 * venta ya estaba en pausa.
 *
 * Cada aviso se manda una sola vez por fecha de fin de prueba. Se registra después de enviarlo:
 * si el envío falla no queda registrado y la próxima corrida lo reintenta.
 */
export class AvisarFinDePrueba {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly correosDeAdmins: CorreosDeAdmins,
    private readonly avisos: AvisosEnviados,
    private readonly enviador: EnviadorDeCorreo,
    private readonly urls: DomainUrls,
    private readonly clock: Clock,
    private readonly timeZone: string,
    private readonly logger: Logger,
  ) {}

  async ejecutar(): Promise<ResumenDeAvisos> {
    const ahora = this.clock.now();
    const resumen: ResumenDeAvisos = { revisados: 0, enviados: 0, sinDestinatario: 0, fallidos: 0 };

    for (const tenant of await this.tenants.listActive()) {
      resumen.revisados += 1;
      const tipo = avisoQueToca(tenant, ahora);
      if (!tipo || !tenant.trialEndsAt) continue;
      const referencia = tenant.trialEndsAt;

      // Un restaurante que falle no detiene a los demás.
      try {
        if (await this.avisos.yaSeEnvio(tenant.id, tipo, referencia)) continue;

        const para = await this.correosDeAdmins(tenant.id);
        if (para.length === 0) {
          resumen.sinDestinatario += 1;
          this.logger.warn('Aviso de prueba sin destinatario: ningún administrador con correo', { slug: tenant.slug, tipo });
          continue;
        }

        const contenido = correoFinDePrueba(tipo, {
          nombreRestaurante: tenant.nombre,
          trialEndsAt: referencia,
          urlPlanes: `${this.urls.tenantUrl(tenant.slug)}/planes`,
          timeZone: this.timeZone,
        });
        await this.enviador.enviar({ para, ...contenido });
        await this.avisos.registrar(tenant.id, tipo, referencia, para);
        resumen.enviados += 1;
        this.logger.info('Aviso de prueba enviado', { slug: tenant.slug, tipo, para });
      } catch (err) {
        resumen.fallidos += 1;
        this.logger.error('Falló el aviso de prueba; se reintenta en la próxima corrida', {
          slug: tenant.slug,
          tipo,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return resumen;
  }
}
