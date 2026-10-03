import type { Correo, EnviadorDeCorreo } from '../../shared/application/ports/EnviadorDeCorreo';

/** En memoria, para pruebas: guarda lo enviado y puede simular un fallo. */
export class FakeEnviador implements EnviadorDeCorreo {
  readonly enviados: Correo[] = [];
  fallar = false;

  async enviar(correo: Correo): Promise<void> {
    if (this.fallar) throw new Error('SMTP caído (simulado)');
    this.enviados.push(correo);
  }
}
