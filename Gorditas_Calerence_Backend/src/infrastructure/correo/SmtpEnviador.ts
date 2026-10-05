import nodemailer, { type Transporter } from 'nodemailer';
import type { Correo, EnviadorDeCorreo } from '../../shared/application/ports/EnviadorDeCorreo';

export interface ConfigSmtp {
  host: string;
  port: number;
  /** TLS desde el inicio (puerto 465). Con `false` se negocia STARTTLS si el servidor lo ofrece. */
  secure: boolean;
  user?: string;
  password?: string;
  /** Remitente: `Cuadranova <no-reply@dominio>`. */
  from: string;
}

/** Envía por SMTP: a Mailpit en local y en el VPS, al proveedor real en producción. */
export class SmtpEnviador implements EnviadorDeCorreo {
  private readonly transporte: Transporter;

  constructor(private readonly cfg: ConfigSmtp) {
    this.transporte = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      ...(cfg.user ? { auth: { user: cfg.user, pass: cfg.password ?? '' } } : {}),
    });
  }

  async enviar(correo: Correo): Promise<void> {
    await this.transporte.sendMail({
      from: this.cfg.from,
      to: correo.para,
      subject: correo.asunto,
      text: correo.texto,
      html: correo.html,
    });
  }
}
