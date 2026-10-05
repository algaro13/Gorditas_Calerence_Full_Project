import type { PlanId, PlanStatus } from '../../../shared/domain/Tenant';
import { categoriaRetencion, faseRetencion, recuperableHasta, siguientePaso, type CategoriaRetencion, type FaseRetencion, type PasoRetencion } from './retencion';

/** Lo que se lee de cada restaurante para la consola. */
export interface DatosRestaurante {
  id: string;
  slug: string;
  nombre: string;
  plan: PlanId;
  planStatus: PlanStatus;
  creadoEl: Date;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
  tieneSuscripcionStripe: boolean;
  activo: boolean;
  usuariosActivos: number;
  ultimoAcceso: Date | null;
  ultimaOrden: Date | null;
  ordenes30d: number;
  archivadoAt: Date | null;
  retencionPausada: boolean;
  /** Pasos del ciclo de inactividad ya enviados para su último uso actual. */
  enviadosRetencion: Partial<Record<PasoRetencion, Date>>;
}

/**
 * Cómo está un restaurante respecto al cobro.
 *
 * `plan-sin-stripe` es un plan activo que nunca pasó por Stripe —la siembra, o uno dado a mano—:
 * opera, pero no paga, y no debe sumar al ingreso.
 */
export type Situacion = 'prueba' | 'prueba-vencida' | 'pago' | 'pago-pendiente' | 'cancelado' | 'plan-sin-stripe';

export type TramoActividad = 'hasta-7' | 'de-8-a-30' | 'de-31-a-90' | 'mas-de-90';

const UN_DIA = 86_400_000;

export function situacion(r: Pick<DatosRestaurante, 'planStatus' | 'trialEndsAt' | 'tieneSuscripcionStripe'>, ahora: Date): Situacion {
  switch (r.planStatus) {
    case 'trial':
      return r.trialEndsAt && r.trialEndsAt.getTime() <= ahora.getTime() ? 'prueba-vencida' : 'prueba';
    case 'active':
      return r.tieneSuscripcionStripe ? 'pago' : 'plan-sin-stripe';
    case 'past_due':
      return r.tieneSuscripcionStripe ? 'pago-pendiente' : 'plan-sin-stripe';
    case 'canceled':
    case 'expired':
    default:
      return 'cancelado';
  }
}

/**
 * Días desde el último uso: la última orden o el último acceso, lo más reciente. Si nunca hubo
 * ninguno, desde el alta: un restaurante que se registró y no volvió también es uno sin uso.
 */
export function diasSinUso(r: Pick<DatosRestaurante, 'ultimoAcceso' | 'ultimaOrden' | 'creadoEl'>, ahora: Date): number {
  const ultimo = Math.max(r.ultimoAcceso?.getTime() ?? 0, r.ultimaOrden?.getTime() ?? 0) || r.creadoEl.getTime();
  return Math.max(0, Math.floor((ahora.getTime() - ultimo) / UN_DIA));
}

export function tramo(dias: number): TramoActividad {
  if (dias <= 7) return 'hasta-7';
  if (dias <= 30) return 'de-8-a-30';
  if (dias <= 90) return 'de-31-a-90';
  return 'mas-de-90';
}

export interface FilaConsola extends DatosRestaurante {
  situacion: Situacion;
  diasSinUso: number;
  tramo: TramoActividad;
  retencion: {
    categoria: CategoriaRetencion;
    fase: FaseRetencion;
    /** Hasta cuándo puede recuperarse; solo si está archivado. */
    recuperableHasta: Date | null;
    /** Lo que haría hoy el trabajo diario, o null. */
    siguientePaso: PasoRetencion | null;
  };
}

export interface ResumenConsola {
  generadoEl: Date;
  total: number;
  porSituacion: Record<Situacion, number>;
  /** De pago (incluye pago pendiente: la suscripción sigue viva). */
  pagoPorPlan: Record<'basico' | 'profesional' | 'empresarial', number>;
  /** Suma de los precios del catálogo de las suscripciones vivas, en MXN. */
  ingresoMensual: number;
  /** De los restaurantes cuya prueba ya terminó, cuántos llegaron a pagar. */
  conversion: { terminaronPrueba: number; pagaron: number; porcentaje: number | null };
  porTramo: Record<TramoActividad, number>;
  porFase: Record<FaseRetencion, number>;
  restaurantes: FilaConsola[];
}

/**
 * Las métricas de la consola. `precios` es el precio mensual de cada plan pagado (del catálogo):
 * se pasa para no atar el dominio al catálogo de cobro.
 */
export function resumir(datos: DatosRestaurante[], precios: Record<string, number>, ahora: Date): ResumenConsola {
  const porSituacion: Record<Situacion, number> = { prueba: 0, 'prueba-vencida': 0, pago: 0, 'pago-pendiente': 0, cancelado: 0, 'plan-sin-stripe': 0 };
  const pagoPorPlan = { basico: 0, profesional: 0, empresarial: 0 };
  const porTramo: Record<TramoActividad, number> = { 'hasta-7': 0, 'de-8-a-30': 0, 'de-31-a-90': 0, 'mas-de-90': 0 };
  const porFase: Record<FaseRetencion, number> = { 'en-uso': 0, 'aviso-1': 0, 'aviso-2': 0, archivado: 0, 'listo-para-borrar': 0 };
  let ingresoMensual = 0;
  let terminaronPrueba = 0;
  let pagaron = 0;

  const restaurantes: FilaConsola[] = datos.map((r) => {
    const s = situacion(r, ahora);
    const dias = diasSinUso(r, ahora);
    const t = tramo(dias);
    porSituacion[s] += 1;
    porTramo[t] += 1;
    if ((s === 'pago' || s === 'pago-pendiente') && r.plan !== 'trial') {
      pagoPorPlan[r.plan] += 1;
      ingresoMensual += precios[r.plan] ?? 0;
    }
    // La prueba terminó si su fecha ya pasó o si el restaurante ya no está en prueba. «Pagó» es
    // haber tenido alguna vez una suscripción de Stripe, aunque hoy esté cancelada.
    const pruebaTerminada = r.planStatus !== 'trial' || (r.trialEndsAt !== null && r.trialEndsAt.getTime() <= ahora.getTime());
    if (pruebaTerminada) {
      terminaronPrueba += 1;
      if (r.tieneSuscripcionStripe) pagaron += 1;
    }
    const categoria = categoriaRetencion(s, r.tieneSuscripcionStripe);
    const fase = faseRetencion({ archivadoAt: r.archivadoAt, enviados: r.enviadosRetencion }, ahora);
    porFase[fase] += 1;
    const retencion = {
      categoria,
      fase,
      recuperableHasta: r.archivadoAt ? recuperableHasta(r.archivadoAt) : null,
      siguientePaso: siguientePaso(
        { categoria, diasSinUso: dias, archivadoAt: r.archivadoAt, pausada: r.retencionPausada, enviados: r.enviadosRetencion },
        ahora,
      ),
    };
    return { ...r, situacion: s, diasSinUso: dias, tramo: t, retencion };
  });

  // Los que más tiempo llevan sin uso, primero: son los que hay que mirar.
  restaurantes.sort((a, b) => b.diasSinUso - a.diasSinUso || a.slug.localeCompare(b.slug));

  return {
    generadoEl: ahora,
    total: datos.length,
    porSituacion,
    pagoPorPlan,
    ingresoMensual,
    conversion: { terminaronPrueba, pagaron, porcentaje: terminaronPrueba > 0 ? Math.round((pagaron / terminaronPrueba) * 100) : null },
    porTramo,
    porFase,
    restaurantes,
  };
}
