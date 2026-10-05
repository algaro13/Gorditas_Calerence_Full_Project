import type { PrismaClient } from '@prisma/client';
import type { AvisosEnviados } from '../../../shared/application/ports/AvisosEnviados';

/** Usa el cliente global: `avisos_enviados` es tabla de plataforma y no tiene RLS. */
export class PrismaAvisosEnviados implements AvisosEnviados {
  constructor(private readonly prisma: PrismaClient) {}

  async yaSeEnvio(tenantId: string, tipo: string, referencia: Date): Promise<boolean> {
    const fila = await this.prisma.avisoEnviado.findUnique({
      where: { tenantId_tipo_referencia: { tenantId, tipo, referencia } },
      select: { id: true },
    });
    return fila !== null;
  }

  async registrar(tenantId: string, tipo: string, referencia: Date, destinatarios: string[]): Promise<void> {
    await this.prisma.avisoEnviado.create({ data: { tenantId, tipo, referencia, destinatarios: destinatarios.join(', ') } });
  }

  async enviados(tenantId: string, referencia: Date): Promise<Record<string, Date>> {
    const filas = await this.prisma.avisoEnviado.findMany({ where: { tenantId, referencia }, select: { tipo: true, enviadoAt: true } });
    return Object.fromEntries(filas.map((f) => [f.tipo, f.enviadoAt]));
  }
}
