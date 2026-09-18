import type { Clock } from '../../../../shared/application/ports/Clock';
import type { Logger } from '../../../../shared/application/ports/Logger';
import type { TenantRepository } from '../../../../shared/application/ports/TenantRepository';
import type { IdentityProvider } from '../../../../shared/application/ports/IdentityProvider';
import { DIAS_SOBRE_CUPO, fechaLimiteDeCupo, type TenantInfo } from '../../../../shared/domain/Tenant';
import { elegirPorCupo } from '../../domain/seleccion-por-cupo';
import type { StaffMember, StaffRepository } from '../ports/StaffRepository';
import type { TenantScope } from '../ports/TenantScope';

export interface EstadoDeCupo {
  /** true si tiene más activos de los que su plan permite. */
  excedido: boolean;
  /** Plazas de más. 0 si cabe. */
  sobran: number;
  /** Cuándo vence el plazo. Null si cabe. Si aún no arrancó, es la fecha que tendría. */
  fechaLimite: Date | null;
  /** Si el plazo ya arrancó de verdad (está registrado en el restaurante). */
  plazoEnMarcha: boolean;
  /** A quién le toca si nadie hace nada, en orden. */
  enRiesgo: StaffMember[];
  /** Plazas que seguirían sobrando por proteger al último administrador. */
  quedanDeMas: number;
  /**
   * A quién ya desactivó el sistema al vencer un plazo, de lo más reciente a lo más antiguo.
   * Solo lo ocurrido hace poco: pasado ese tiempo deja de ser noticia y el aviso estorba.
   */
  desactivadosPorCupo: StaffMember[];
}

/** Cuánto tiempo la pantalla sigue contando lo que desactivó el sistema. */
export const DIAS_AVISO_DESACTIVADOS = 30;

export type ResultadoAplicar =
  | { accion: 'nada' }
  | { accion: 'plazo-iniciado'; fechaLimite: Date }
  | { accion: 'plazo-cancelado' }
  | { accion: 'ajustado'; desactivados: StaffMember[]; quedanDeMas: number };

/**
 * Cupo del restaurante: consultar qué pasaría, y aplicar lo que toque.
 *
 * Están separados a propósito. La pantalla **consulta** y no debe cambiar nada — un GET que
 * desactiva gente es una trampa. El trabajo diario **aplica**: arranca el plazo, lo cancela si
 * el restaurante volvió a caber, y al vencer desactiva a los que sobran.
 *
 * Ambos parten de `elegirPorCupo`, así que el nombre que anuncia el aviso y el que se desactiva
 * el día del vencimiento salen del mismo cálculo y no pueden discrepar.
 */
export class EvaluarCupo {
  constructor(
    private readonly scope: TenantScope,
    private readonly staff: StaffRepository,
    private readonly tenants: TenantRepository,
    private readonly identity: IdentityProvider,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  /** Solo lee. */
  async consultar(tenant: TenantInfo): Promise<EstadoDeCupo> {
    const miembros = await this.scope.run(tenant.id, () => this.staff.list());
    const { elegidos, quedanDeMas } = elegirPorCupo(miembros, tenant.maxUsuarios);
    const sobran = elegidos.length + quedanDeMas;

    // Se informa aunque el restaurante ya vuelva a caber: precisamente cuando cabe otra vez es
    // porque el sistema desactivó a alguien, y ese es el momento en que hay que explicarlo.
    const corte = new Date(this.clock.now().getTime() - DIAS_AVISO_DESACTIVADOS * 24 * 60 * 60 * 1000);
    const desactivadosPorCupo = miembros
      .filter((m) => !m.activo && m.desactivadoPorCupo !== null && m.desactivadoPorCupo > corte)
      .sort((a, b) => b.desactivadoPorCupo!.getTime() - a.desactivadoPorCupo!.getTime());

    if (sobran === 0) {
      return { excedido: false, sobran: 0, fechaLimite: null, plazoEnMarcha: false, enRiesgo: [], quedanDeMas: 0, desactivadosPorCupo };
    }

    // Si el plazo aún no arrancó (lo hará el trabajo diario), se muestra la fecha que tendría,
    // para que la pantalla no quede muda entre que aparece el exceso y corre el trabajo.
    const desde = tenant.sobreCupoDesde ?? this.clock.now();
    return {
      excedido: true,
      sobran,
      fechaLimite: fechaLimiteDeCupo(desde),
      plazoEnMarcha: tenant.sobreCupoDesde !== null,
      enRiesgo: elegidos,
      quedanDeMas,
      desactivadosPorCupo,
    };
  }

  /** Lee y actúa. Lo usa el trabajo diario. */
  async aplicar(tenant: TenantInfo): Promise<ResultadoAplicar> {
    const ahora = this.clock.now();
    const estado = await this.consultar(tenant);

    if (!estado.excedido) {
      if (tenant.sobreCupoDesde) {
        await this.tenants.setSobreCupoDesde(tenant.id, null);
        return { accion: 'plazo-cancelado' };
      }
      return { accion: 'nada' };
    }

    if (!tenant.sobreCupoDesde) {
      await this.tenants.setSobreCupoDesde(tenant.id, ahora);
      this.logger.info('Restaurante por encima de su cupo: arranca el plazo', {
        tenantId: tenant.id,
        slug: tenant.slug,
        sobran: estado.sobran,
        dias: DIAS_SOBRE_CUPO,
      });
      return { accion: 'plazo-iniciado', fechaLimite: fechaLimiteDeCupo(ahora)! };
    }

    if (ahora < estado.fechaLimite!) return { accion: 'nada' };

    // Venció. Se desactiva también en el proveedor de identidad, como una baja manual: apagar
    // solo el espejo dejaría a la persona entrando con su token.
    const desactivados: StaffMember[] = [];
    for (const miembro of estado.enRiesgo) {
      try {
        await this.identity.setUserActive(miembro.zitadelUserId, false);
      } catch (err) {
        this.logger.warn('No se pudo desactivar en el proveedor; se salta', {
          tenantId: tenant.id,
          miembro: miembro.id,
          err: String(err),
        });
        continue;
      }
      // Se marca la fecha para poder decir después que fue el sistema y no una baja a mano.
      await this.scope.run(tenant.id, () => this.staff.update(miembro.id, { activo: false, desactivadoPorCupo: ahora }));
      desactivados.push(miembro);
    }

    if (desactivados.length > 0) {
      this.logger.info('Cupo ajustado al vencer el plazo', {
        tenantId: tenant.id,
        slug: tenant.slug,
        desactivados: desactivados.map((m) => m.email),
      });
    }
    if (estado.quedanDeMas > 0) {
      this.logger.warn('Sigue por encima del cupo: solo queda el último administrador', {
        tenantId: tenant.id,
        slug: tenant.slug,
        quedanDeMas: estado.quedanDeMas,
      });
    }

    // Se limpia la marca: si sigue excedido, la próxima corrida abre un plazo nuevo en vez de
    // desactivar otra tanda de inmediato.
    await this.tenants.setSobreCupoDesde(tenant.id, null);
    return { accion: 'ajustado', desactivados, quedanDeMas: estado.quedanDeMas };
  }

  /** Recorre la plataforma entera. Un restaurante que falle no detiene a los demás. */
  async aplicarATodos(): Promise<Array<{ tenant: TenantInfo; resultado: ResultadoAplicar | null }>> {
    const tenants = await this.tenants.listActive();
    const salida: Array<{ tenant: TenantInfo; resultado: ResultadoAplicar | null }> = [];
    for (const tenant of tenants) {
      try {
        salida.push({ tenant, resultado: await this.aplicar(tenant) });
      } catch (err) {
        this.logger.error('Falló la evaluación de cupo', { tenantId: tenant.id, slug: tenant.slug, err: String(err) });
        salida.push({ tenant, resultado: null });
      }
    }
    return salida;
  }
}
