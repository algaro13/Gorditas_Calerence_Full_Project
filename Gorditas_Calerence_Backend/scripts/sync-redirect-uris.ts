/**
 * Reconstruye las redirect URIs de la app SPA en Zitadel a partir de la tabla `tenants`.
 * Úsalo tras cambiar de dominio (docs/cambiar-dominio.md) o si la lista quedó incompleta.
 *
 *   NODE_ENV=production npx tsx scripts/sync-redirect-uris.ts
 *
 * Agrega (no borra) `<url del tenant>/callback` y `<url del tenant>` de cada restaurante activo,
 * más `app.<APP_DOMAIN>`. Las URIs del dominio anterior se retiran a mano en la consola.
 */
import { buildContainer } from '../src/container';

async function main(): Promise<void> {
  const c = buildContainer();
  try {
    const tenants = await c.prisma.tenant.findMany({ where: { activo: true }, select: { slug: true } });
    // La plataforma se alcanza por su subdominio, por el dominio a secas y por www: desde cualquiera
    // de los tres se puede iniciar sesión, así que las tres direcciones de retorno deben existir.
    const plataforma = [c.urls.appUrl(), `${c.env.APP_SCHEME}://${c.env.APP_DOMAIN}`, `${c.env.APP_SCHEME}://www.${c.env.APP_DOMAIN}`];
    const redirect = [...plataforma.map((u) => `${u}/callback`), ...tenants.map((t) => c.urls.tenantCallbackUrl(t.slug))];
    const postLogout = [...plataforma, ...tenants.map((t) => c.urls.tenantUrl(t.slug))];
    await c.identityProvider.registerRedirectUris({ redirect, postLogout });
    c.logger.info(`Redirect URIs sincronizadas en Zitadel: ${redirect.length} direcciones (${tenants.length} restaurantes) en ${c.env.APP_DOMAIN}`);
  } finally {
    await c.prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
