import { DIAS_PARA_RECUPERAR } from '../../../shared/domain/Tenant';
import { MARCA, plantillaCorreo } from '../../../shared/domain/plantilla-correo';
import type { Situacion } from './resumen';

/**
 * Qué trato recibe una cuenta respecto a la inactividad.
 *
 * - `protegida`: paga, tiene un pago pendiente o un plan asignado a mano. Nunca se avisa ni archiva.
 * - `prueba-sin-pago`: nunca pagó. Plazos cortos.
 * - `pago-cancelado`: pagó alguna vez y canceló. Un año de gracia antes de empezar.
 */
export type CategoriaRetencion = 'protegida' | 'prueba-sin-pago' | 'pago-cancelado';

export const PLAZOS: Record<Exclude<CategoriaRetencion, 'protegida'>, { aviso1: number; aviso2: number; archivar: number }> = {
  'prueba-sin-pago': { aviso1: 30, aviso2: 60, archivar: 90 },
  'pago-cancelado': { aviso1: 365, aviso2: 395, archivar: 425 },
};

/**
 * Margen mínimo entre un paso y el siguiente. Si el trabajo se saltó días —un servidor apagado—,
 * nadie recibe el segundo aviso al día siguiente del primero, ni se archiva sin tiempo de leerlo.
 */
export const DIAS_ENTRE_PASOS = 7;

export type PasoRetencion = 'inactividad-1' | 'inactividad-2' | 'archivado';

const UN_DIA = 86_400_000;

export function categoriaRetencion(situacion: Situacion, tieneSuscripcionStripe: boolean): CategoriaRetencion {
  switch (situacion) {
    case 'pago':
    case 'pago-pendiente':
    case 'plan-sin-stripe':
      return 'protegida';
    case 'cancelado':
      return tieneSuscripcionStripe ? 'pago-cancelado' : 'prueba-sin-pago';
    default:
      return 'prueba-sin-pago';
  }
}

/**
 * El último uso: la última orden o el último acceso, lo más reciente; si nunca hubo, el alta.
 *
 * Es también la «referencia» con la que se registran los avisos: si el restaurante vuelve, su
 * último uso cambia, los avisos anteriores dejan de contar y el ciclo empieza de cero.
 */
export function ultimoUso(r: { ultimoAcceso: Date | null; ultimaOrden: Date | null; creadoEl: Date }): Date {
  const t = Math.max(r.ultimoAcceso?.getTime() ?? 0, r.ultimaOrden?.getTime() ?? 0);
  return t > 0 ? new Date(t) : r.creadoEl;
}

export interface EstadoRetencion {
  categoria: CategoriaRetencion;
  diasSinUso: number;
  archivadoAt: Date | null;
  pausada: boolean;
  /** Cuándo se envió cada paso para el último uso actual. */
  enviados: Partial<Record<PasoRetencion, Date>>;
}

/** El siguiente paso que toca hoy, o null. En orden y con margen entre pasos. */
export function siguientePaso(e: EstadoRetencion, ahora: Date): PasoRetencion | null {
  if (e.categoria === 'protegida' || e.archivadoAt || e.pausada) return null;
  // Ya se archivó por este mismo último uso y alguien lo restauró: el ciclo vuelve a empezar
  // cuando haya uso nuevo, no al día siguiente.
  if (e.enviados.archivado) return null;
  const p = PLAZOS[e.categoria];
  const conMargen = (d?: Date) => !!d && ahora.getTime() - d.getTime() >= DIAS_ENTRE_PASOS * UN_DIA;

  const a1 = e.enviados['inactividad-1'];
  if (!a1) return e.diasSinUso >= p.aviso1 ? 'inactividad-1' : null;
  const a2 = e.enviados['inactividad-2'];
  if (!a2) return e.diasSinUso >= p.aviso2 && conMargen(a1) ? 'inactividad-2' : null;
  return e.diasSinUso >= p.archivar && conMargen(a2) ? 'archivado' : null;
}

/**
 * La fecha en que se archivaría, para decirla en el aviso. Nunca antes de lo que permite el margen
 * entre pasos: si se dijera una fecha anterior, el aviso mentiría.
 */
export function fechaDeArchivo(categoria: Exclude<CategoriaRetencion, 'protegida'>, uso: Date, paso: 'inactividad-1' | 'inactividad-2', ahora: Date): Date {
  const porPlazo = uso.getTime() + PLAZOS[categoria].archivar * UN_DIA;
  const minimo = ahora.getTime() + (paso === 'inactividad-1' ? 2 : 1) * DIAS_ENTRE_PASOS * UN_DIA;
  return new Date(Math.max(porPlazo, minimo));
}

export const recuperableHasta = (archivadoAt: Date): Date => new Date(archivadoAt.getTime() + DIAS_PARA_RECUPERAR * UN_DIA);

/** Fase visible en la consola. */
export type FaseRetencion = 'en-uso' | 'aviso-1' | 'aviso-2' | 'archivado' | 'listo-para-borrar';

export function faseRetencion(e: Pick<EstadoRetencion, 'archivadoAt' | 'enviados'>, ahora: Date): FaseRetencion {
  if (e.archivadoAt) return ahora.getTime() >= recuperableHasta(e.archivadoAt).getTime() ? 'listo-para-borrar' : 'archivado';
  if (e.enviados.archivado) return 'en-uso';
  if (e.enviados['inactividad-2']) return 'aviso-2';
  if (e.enviados['inactividad-1']) return 'aviso-1';
  return 'en-uso';
}

export interface DatosCorreoRetencion {
  nombreRestaurante: string;
  diasSinUso: number;
  /** Para los avisos: cuándo se archivaría. Para el de archivado: hasta cuándo se recupera. */
  fecha: Date;
  urlEntrar: string;
  urlReportes: string;
  timeZone: string;
}

/**
 * Los tres correos del ciclo. Siempre con una salida a la vista: entrar basta para conservar el
 * restaurante, y los reportes se descargan en Excel antes de irse.
 */
export function correoRetencion(paso: PasoRetencion, d: DatosCorreoRetencion): { asunto: string; texto: string; html: string } {
  const fecha = d.fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: d.timeZone });
  const entrar = { texto: 'Entrar a mi restaurante', url: d.urlEntrar, principal: true };
  const reportes = { texto: 'Descargar mis reportes', url: d.urlReportes };

  if (paso === 'inactividad-1') {
    return {
      asunto: `¿Sigues usando ${MARCA}? — ${d.nombreRestaurante}`,
      ...plantillaCorreo({
        parrafos: [
          `Hace ${d.diasSinUso} días que nadie entra a ${d.nombreRestaurante} en ${MARCA}.`,
          `Si no vuelves a usarlo, el ${fecha} lo archivaremos: dejará de funcionar, aunque podrás recuperarlo durante ${DIAS_PARA_RECUPERAR} días más.`,
          'Para conservarlo, basta con entrar. Si prefieres irte, antes descarga tus reportes en Excel.',
        ],
        botones: [entrar, reportes],
      }),
    };
  }
  if (paso === 'inactividad-2') {
    return {
      asunto: `Último aviso: archivaremos ${d.nombreRestaurante} el ${fecha}`,
      ...plantillaCorreo({
        parrafos: [
          `${d.nombreRestaurante} lleva ${d.diasSinUso} días sin uso en ${MARCA}.`,
          `El ${fecha} lo archivaremos. Desde ese día tendrás ${DIAS_PARA_RECUPERAR} días para recuperarlo; después, sus datos podrían eliminarse.`,
          'Para conservarlo, basta con entrar antes de esa fecha. Si prefieres irte, descarga ahora tus reportes en Excel.',
        ],
        botones: [entrar, reportes],
      }),
    };
  }
  return {
    asunto: `Archivamos ${d.nombreRestaurante}`,
    ...plantillaCorreo({
      parrafos: [
        `Como nadie lo usaba, archivamos ${d.nombreRestaurante} en ${MARCA}. Ya no funciona, pero sus datos siguen guardados.`,
        `Puedes recuperarlo hasta el ${fecha}: entra y pulsa «Recuperar mi restaurante». Después de esa fecha sus datos podrían eliminarse.`,
      ],
      botones: [{ texto: 'Recuperar mi restaurante', url: d.urlEntrar, principal: true }],
    }),
  };
}
