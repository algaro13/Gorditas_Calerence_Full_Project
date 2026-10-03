import { PLAN_LIMITS, type TenantInfo } from '../../../shared/domain/Tenant';

export type TipoAvisoPrueba = 'prueba-por-vencer' | 'prueba-vencida';

/** Con cuántos días de antelación se avisa que la prueba se acaba. */
export const DIAS_AVISO_PREVIO = 3;

/**
 * Hasta cuántos días después de vencida se manda el aviso de «terminó».
 *
 * Sin este tope, el primer día que corriera el trabajo escribiría a todos los restaurantes cuya
 * prueba terminó hace meses —los de la siembra del entorno de pruebas, los que se fueron—.
 */
export const DIAS_AVISO_VENCIDA = 7;

const UN_DIA = 86_400_000;

/** Qué aviso le toca hoy a un restaurante, o null si ninguno. No mira si ya se envió. */
export function avisoQueToca(t: Pick<TenantInfo, 'planStatus' | 'trialEndsAt'>, ahora: Date): TipoAvisoPrueba | null {
  // Quien ya contrató, o canceló, no está en prueba: no le toca ninguno.
  if (t.planStatus !== 'trial' || !t.trialEndsAt) return null;
  const falta = t.trialEndsAt.getTime() - ahora.getTime();
  if (falta > 0) return falta <= DIAS_AVISO_PREVIO * UN_DIA ? 'prueba-por-vencer' : null;
  return -falta <= DIAS_AVISO_VENCIDA * UN_DIA ? 'prueba-vencida' : null;
}

export interface DatosAviso {
  nombreRestaurante: string;
  trialEndsAt: Date;
  /** `https://<slug>.<dominio>/planes` */
  urlPlanes: string;
  /** Zona del negocio, para que la fecha sea la del restaurante y no la del servidor. */
  timeZone: string;
}

export interface ContenidoCorreo {
  asunto: string;
  texto: string;
  html: string;
}

const MARCA = 'Kustodela POS';

const NOMBRES_PLAN: Record<keyof typeof PLAN_LIMITS, string> = {
  basico: 'Básico',
  profesional: 'Profesional',
  empresarial: 'Empresarial',
};

/** El plan Empresarial guarda 999 como «sin límite». */
const SIN_TOPE = 999;

/** «Básico: $299 MXN al mes, hasta 3 usuarios». Sale de `PLAN_LIMITS`, no se escribe a mano. */
function lineasDePlanes(): string[] {
  return (Object.keys(PLAN_LIMITS) as (keyof typeof PLAN_LIMITS)[]).map((id) => {
    const { precioMxn, maxUsuarios } = PLAN_LIMITS[id];
    const usuarios = maxUsuarios >= SIN_TOPE ? 'usuarios ilimitados' : `hasta ${maxUsuarios} usuarios`;
    return `${NOMBRES_PLAN[id]}: $${precioMxn} MXN al mes, ${usuarios}`;
  });
}

const escapar = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Los dos correos de fin de prueba.
 *
 * Dicen la fecha y no «en 3 días»: el trabajo corre una vez al día y a veces quedan dos días y
 * pico. Con la fecha, el correo es verdad lo lea quien lo lea y cuando lo lea.
 */
export function correoFinDePrueba(tipo: TipoAvisoPrueba, d: DatosAviso): ContenidoCorreo {
  const fecha = d.trialEndsAt.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: d.timeZone });
  const planes = lineasDePlanes();

  const porVencer = tipo === 'prueba-por-vencer';
  const asunto = porVencer
    ? `Tu prueba de ${MARCA} termina el ${fecha}`
    : `Tu prueba de ${MARCA} terminó — ${d.nombreRestaurante}`;
  const parrafos = porVencer
    ? [
        `La prueba gratuita de ${d.nombreRestaurante} en ${MARCA} termina el ${fecha}.`,
        'Después de esa fecha el punto de venta queda en pausa hasta que elijas un plan. Para seguir sin interrupciones, elígelo antes.',
      ]
    : [
        `La prueba gratuita de ${d.nombreRestaurante} en ${MARCA} terminó el ${fecha}, así que el punto de venta está en pausa.`,
        'Tus datos están intactos: tus mesas, tus platillos, tus órdenes y tus reportes. En cuanto elijas un plan, todo vuelve a donde estaba.',
      ];
  const llamada = porVencer ? 'Elegir mi plan' : 'Reactivar mi punto de venta';

  const texto = [
    'Hola:',
    '',
    ...parrafos.flatMap((p) => [p, '']),
    `${llamada}: ${d.urlPlanes}`,
    '',
    'Planes:',
    ...planes.map((p) => `- ${p}`),
    '',
    `— ${MARCA}`,
    '',
    'Recibes este correo porque eres administrador de este restaurante.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
<p style="font-size:16px;margin:0 0 16px">Hola:</p>
${parrafos.map((p) => `<p style="font-size:16px;line-height:1.5;margin:0 0 16px">${escapar(p)}</p>`).join('\n')}
<p style="margin:24px 0"><a href="${escapar(d.urlPlanes)}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:12px 20px;border-radius:8px">${llamada}</a></p>
<p style="font-size:14px;color:#4b5563;margin:0 0 8px">Planes:</p>
<ul style="font-size:14px;color:#4b5563;margin:0 0 16px;padding-left:20px">
${planes.map((p) => `<li>${escapar(p)}</li>`).join('\n')}
</ul>
<p style="font-size:14px;color:#6b7280;margin:16px 0 0">— ${MARCA}</p>
</div>
<p style="max-width:560px;margin:12px auto 0;font-size:12px;color:#9ca3af">Recibes este correo porque eres administrador de este restaurante.</p>
</body></html>`;

  return { asunto, texto, html };
}
