import type { TipoAvisoPrueba } from '../../domain/aviso-prueba';

/** Registro de los avisos ya enviados (tabla de plataforma `avisos_enviados`). */
export interface AvisosEnviados {
  yaSeEnvio(tenantId: string, tipo: TipoAvisoPrueba, referencia: Date): Promise<boolean>;
  registrar(tenantId: string, tipo: TipoAvisoPrueba, referencia: Date, destinatarios: string[]): Promise<void>;
}
