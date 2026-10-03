import type { Clock } from '../../../shared/application/ports/Clock';
import type { AuthInfo } from '../../../shared/domain/Auth';
import { resumir, type DatosRestaurante, type ResumenConsola } from '../domain/resumen';

export interface LecturaPlataforma {
  restaurantes(ahora: Date): Promise<DatosRestaurante[]>;
}

export interface Bitacora {
  registrar(entrada: { operadorId: string; operadorEmail: string; accion: string; detalle?: Record<string, unknown> }): Promise<void>;
}

/**
 * El resumen de la consola de plataforma. Solo lee; cada consulta queda en la bitácora antes de
 * devolver nada, para que no haya consulta sin registro.
 */
export class ResumenPlataforma {
  constructor(
    private readonly lectura: LecturaPlataforma,
    private readonly bitacora: Bitacora,
    private readonly clock: Clock,
    /** Precio mensual de cada plan pagado, del catálogo. */
    private readonly precios: Record<string, number>,
    /** El correo del operador cuando el token no lo trae (los de Zitadel no lo traen). */
    private readonly correoDe: (userId: string) => Promise<string | null> = async () => null,
  ) {}

  async ejecutar(operador: AuthInfo): Promise<ResumenConsola> {
    // Sin el correo, la bitácora solo tendría un número: hay que poder leer quién fue.
    const email = operador.email || ((await this.correoDe(operador.userId).catch(() => null)) ?? '');
    await this.bitacora.registrar({ operadorId: operador.userId, operadorEmail: email, accion: 'ver-resumen' });
    const ahora = this.clock.now();
    return resumir(await this.lectura.restaurantes(ahora), this.precios, ahora);
  }
}
