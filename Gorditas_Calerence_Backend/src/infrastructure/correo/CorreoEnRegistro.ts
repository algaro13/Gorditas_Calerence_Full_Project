import type { Logger } from '../../shared/application/ports/Logger';
import type { Correo, EnviadorDeCorreo } from '../../shared/application/ports/EnviadorDeCorreo';

/**
 * Sin `SMTP_HOST`: el correo se escribe en el registro en vez de enviarse.
 *
 * Así un entorno sin SMTP configurado no falla ni deja avisos pendientes para siempre; queda
 * constancia de qué se habría mandado y a quién.
 */
export class CorreoEnRegistro implements EnviadorDeCorreo {
  constructor(private readonly logger: Logger) {}

  async enviar(correo: Correo): Promise<void> {
    this.logger.warn('SMTP no configurado: correo no enviado', { para: correo.para, asunto: correo.asunto });
  }
}
