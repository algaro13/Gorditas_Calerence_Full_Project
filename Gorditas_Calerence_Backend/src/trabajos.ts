import type { Container } from './container';
import { TrabajoPeriodico } from './shared/infrastructure/scheduler/TrabajoPeriodico';

const UN_DIA = 24 * 60 * 60 * 1000;
/** Margen tras el arranque: deja que el servidor termine de levantar antes de la primera corrida. */
const ESPERA_INICIAL = 60_000;

export interface ResumenDeCupos {
  revisados: number;
  iniciados: number;
  cancelados: number;
  ajustados: number;
  fallidos: number;
}

/**
 * Evalúa el cupo de todos los restaurantes y deja dicho en el registro qué pasó.
 *
 * La usan las dos vías —el programador del backend y `scripts/evaluar-cupos.ts`— para que una
 * corrida a mano durante un incidente haga exactamente lo mismo que la automática.
 */
export async function evaluarCupos(c: Container): Promise<ResumenDeCupos> {
  const log = c.logger.child({ component: 'cupo' });
  const resultados = await c.evaluarCupo.aplicarATodos();
  const resumen: ResumenDeCupos = { revisados: resultados.length, iniciados: 0, cancelados: 0, ajustados: 0, fallidos: 0 };

  for (const { tenant, resultado } of resultados) {
    if (!resultado) {
      resumen.fallidos += 1;
      continue;
    }
    switch (resultado.accion) {
      case 'plazo-iniciado':
        resumen.iniciados += 1;
        log.info('Excede su plan: arranca el plazo', { slug: tenant.slug, fechaLimite: resultado.fechaLimite.toISOString() });
        break;
      case 'plazo-cancelado':
        resumen.cancelados += 1;
        log.info('Volvió a caber: plazo cancelado', { slug: tenant.slug });
        break;
      case 'ajustado':
        resumen.ajustados += 1;
        log.info('Venció el plazo: cupo ajustado', { slug: tenant.slug, desactivados: resultado.desactivados.map((m) => m.email) });
        if (resultado.quedanDeMas > 0) {
          log.warn('Sigue por encima del cupo: solo queda el último administrador', { slug: tenant.slug, quedanDeMas: resultado.quedanDeMas });
        }
        break;
      default:
        break;
    }
  }

  log.info('Cupos revisados', { ...resumen });
  return resumen;
}

/**
 * Arranca los trabajos que el backend se programa a sí mismo.
 *
 * Se llama desde `main.ts` y no desde `createApp`, a propósito: montar la app en una prueba no
 * debe poner temporizadores en marcha. Devuelve los trabajos para poder pararlos al cerrar.
 */
export function programarTrabajos(c: Container): TrabajoPeriodico[] {
  // En pruebas no: una evaluación de fondo tocando la base pelearía con los casos.
  if (c.env.NODE_ENV === 'test') return [];

  const trabajos = [
    new TrabajoPeriodico({
      nombre: 'evaluar-cupos',
      cada: UN_DIA,
      primeraEn: ESPERA_INICIAL,
      trabajo: async () => {
        await evaluarCupos(c);
      },
      logger: c.logger,
    }),
  ];
  for (const t of trabajos) t.start();
  return trabajos;
}
