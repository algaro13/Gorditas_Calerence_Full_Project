import type { Logger } from '../../application/ports/Logger';

export interface OpcionesTrabajoPeriodico {
  /** Nombre para los registros. */
  nombre: string;
  /** Cada cuánto se repite, en milisegundos. */
  cada: number;
  /** Cuánto espera antes de la primera corrida. Da margen a que el arranque termine. */
  primeraEn: number;
  trabajo: () => Promise<void>;
  logger: Logger;
}

/**
 * Un trabajo que se repite solo, dentro del propio proceso del backend.
 *
 * Existe en vez de un cron del host por una razón concreta: lo que vive en el disco del
 * servidor se pierde al reconstruirlo, y el ensayo de recuperación demostró que un paso manual
 * más es un paso que falla el día que hay prisa. Esto viaja en la imagen y arranca solo.
 *
 * Se repite a intervalo fijo desde el arranque, no a una hora del día, para que un reinicio a
 * la hora equivocada no se salte una ejecución.
 */
export class TrabajoPeriodico {
  private timer: NodeJS.Timeout | null = null;
  private corriendo = false;
  private detenido = false;

  constructor(private readonly opts: OpcionesTrabajoPeriodico) {}

  /** Programa la primera corrida. Llamarlo dos veces no duplica el temporizador. */
  start(): void {
    if (this.timer || this.detenido) return;
    this.programar(this.opts.primeraEn);
    this.opts.logger.info('Trabajo periódico programado', {
      trabajo: this.opts.nombre,
      primeraEnMs: this.opts.primeraEn,
      cadaMs: this.opts.cada,
    });
  }

  /** Corta el temporizador. Una corrida en marcha termina; no se programa otra. */
  stop(): void {
    this.detenido = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private programar(enMs: number): void {
    // `unref` para que un temporizador pendiente no impida que el proceso termine.
    this.timer = setTimeout(() => void this.ejecutar(), enMs);
    this.timer.unref?.();
  }

  private async ejecutar(): Promise<void> {
    this.timer = null;
    if (this.detenido) return;

    // Si la anterior sigue, se salta: dos evaluaciones a la vez se pisarían.
    if (this.corriendo) {
      this.opts.logger.warn('Trabajo periódico saltado: la corrida anterior sigue en marcha', { trabajo: this.opts.nombre });
      if (!this.detenido) this.programar(this.opts.cada);
      return;
    }

    this.corriendo = true;
    try {
      await this.opts.trabajo();
    } catch (err) {
      // Un fallo no puede matar el programador: mañana se vuelve a intentar.
      this.opts.logger.error('Falló el trabajo periódico', { trabajo: this.opts.nombre, err: String(err) });
    } finally {
      this.corriendo = false;
      if (!this.detenido) this.programar(this.opts.cada);
    }
  }
}
