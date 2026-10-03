/** Un correo listo para enviar: el mismo contenido en texto plano y en HTML. */
export interface Correo {
  para: string[];
  asunto: string;
  texto: string;
  html: string;
}

/**
 * Envía correos del propio backend (los de Zitadel los envía Zitadel).
 *
 * SMTP en local, en el VPS y en producción; solo registro cuando no hay `SMTP_HOST`; y uno en
 * memoria en las pruebas. Lanza si el envío falla: quien llama decide si reintenta.
 */
export interface EnviadorDeCorreo {
  enviar(correo: Correo): Promise<void>;
}
