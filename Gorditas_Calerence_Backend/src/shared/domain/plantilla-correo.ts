/** Marca que firman los correos del backend. */
export const MARCA = 'Cuadranova';

export interface Boton {
  texto: string;
  url: string;
  /** El principal va en naranja; los demás, en gris. */
  principal?: boolean;
}

export interface CuerpoCorreo {
  parrafos: string[];
  botones: Boton[];
  /** Una lista opcional al final, con su título (por ejemplo, los planes). */
  lista?: { titulo: string; items: string[] };
}

const escapar = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * El mismo correo en texto plano y en HTML, con el diseño de todos los avisos del backend.
 *
 * Todo lo que viene de fuera (el nombre del restaurante, una url) se escapa: un nombre como
 * «Gorditas <Doña>» no debe romper el HTML.
 */
export function plantillaCorreo(c: CuerpoCorreo): { texto: string; html: string } {
  const texto = [
    'Hola:',
    '',
    ...c.parrafos.flatMap((p) => [p, '']),
    ...c.botones.map((b) => `${b.texto}: ${b.url}`),
    ...(c.lista ? ['', `${c.lista.titulo}:`, ...c.lista.items.map((i) => `- ${i}`)] : []),
    '',
    `— ${MARCA}`,
    '',
    'Recibes este correo porque eres administrador de este restaurante.',
  ].join('\n');

  const estiloBoton = (principal?: boolean) =>
    principal
      ? 'display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:12px 20px;border-radius:8px;margin:0 8px 8px 0'
      : 'display:inline-block;background:#f3f4f6;color:#1f2937;text-decoration:none;font-size:16px;font-weight:bold;padding:12px 20px;border-radius:8px;margin:0 8px 8px 0';

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
<p style="font-size:16px;margin:0 0 16px">Hola:</p>
${c.parrafos.map((p) => `<p style="font-size:16px;line-height:1.5;margin:0 0 16px">${escapar(p)}</p>`).join('\n')}
<p style="margin:24px 0 16px">${c.botones.map((b) => `<a href="${escapar(b.url)}" style="${estiloBoton(b.principal)}">${escapar(b.texto)}</a>`).join('')}</p>
${
  c.lista
    ? `<p style="font-size:14px;color:#4b5563;margin:0 0 8px">${escapar(c.lista.titulo)}:</p>
<ul style="font-size:14px;color:#4b5563;margin:0 0 16px;padding-left:20px">
${c.lista.items.map((i) => `<li>${escapar(i)}</li>`).join('\n')}
</ul>`
    : ''
}
<p style="font-size:14px;color:#6b7280;margin:16px 0 0">— ${MARCA}</p>
</div>
<p style="max-width:560px;margin:12px auto 0;font-size:12px;color:#9ca3af">Recibes este correo porque eres administrador de este restaurante.</p>
</body></html>`;

  return { texto, html };
}
