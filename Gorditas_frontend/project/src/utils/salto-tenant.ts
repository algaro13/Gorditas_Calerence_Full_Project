import { getTenantSlug } from '../config/tenant-host';

/**
 * En el host de la plataforma no vive el POS de nadie: si ya se sabe a qué restaurante pertenece
 * la persona, hay que llevarla a su dirección. Devuelve el destino, o null si no hay que saltar
 * (porque ya estamos en el restaurante, o en local todo comparte el mismo origen).
 *
 * `sso=1` le dice a la pantalla de acceso del restaurante que complete la entrada sin volver a
 * pedir credenciales, aprovechando la sesión que Zitadel ya tiene abierta.
 */
export function saltoAlRestaurante(url: string | null | undefined): string | null {
  if (!url || getTenantSlug() !== null) return null;
  try {
    const destino = new URL(url);
    return destino.origin === window.location.origin ? null : `${destino.origin}/login?sso=1`;
  } catch {
    return null;
  }
}
