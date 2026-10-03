import type { PrismaClient } from '@prisma/client';
import type { AvisosEnviados } from '../application/ports/AvisosEnviados';
import type { TipoAvisoPrueba } from '../domain/aviso-prueba';

/** Usa el cliente global: `avisos_enviados` es tabla de plataforma y no tiene RLS. */
export class PrismaAvisosEnviados implements AvisosEnviados {
  constructor(private readonly prisma: PrismaClient) {}

  async yaSeEnvio(tenantId: string, tipo: TipoAvisoPrueba, referencia: Date): Promise<boolean> {
    const fila = await this.prisma.avisoEnviado.findUnique({
      where: { tenantId_tipo_referencia: { tenantId, tipo, referencia } },
      select: { id: true },
    });
    return fila !== null;
  }

  async registrar(tenantId: string, tipo: TipoAvisoPrueba, referencia: Date, destinatarios: string[]): Promise<void> {
    await this.prisma.avisoEnviado.create({ data: { tenantId, tipo, referencia, destinatarios: destinatarios.join(', ') } });
  }
}
