/**
 * Registro de los avisos ya enviados (tabla de plataforma `avisos_enviados`).
 *
 * `tipo` es el aviso (`prueba-por-vencer`, `inactividad-1`…) y `referencia` la fecha a la que se
 * refiere (el fin de la prueba, el último uso): la misma pareja nunca se envía dos veces.
 */
export interface AvisosEnviados {
  yaSeEnvio(tenantId: string, tipo: string, referencia: Date): Promise<boolean>;
  registrar(tenantId: string, tipo: string, referencia: Date, destinatarios: string[]): Promise<void>;
  /** Cuándo se envió cada tipo para esa referencia. */
  enviados(tenantId: string, referencia: Date): Promise<Record<string, Date>>;
}
