# Cambiar el dominio de la aplicación

El dominio no aparece en el código. Existe una sola fuente de verdad por entorno y todo lo demás se deriva de ella:

| Dónde | Variable | Derivados |
|-------|----------|-----------|
| `.env` raíz (compose) | `APP_DOMAIN` | hosts del Caddyfile (`{$APP_DOMAIN}`), `ZITADEL_EXTERNALDOMAIN=auth.<APP_DOMAIN>`, `CUSTOM_REQUEST_HEADERS` del login |
| `Gorditas_Calerence_Backend/.env.production` | `APP_DOMAIN`, `APP_SCHEME`, `FRONTEND_BASE_URL`, `ZITADEL_*` | URL de cada tenant, redirect URIs, URLs de retorno de Stripe, CORS |
| `Gorditas_frontend/project/.env.production` | `VITE_APP_DOMAIN`, `VITE_API_URL`, `VITE_ZITADEL_AUTHORITY` | slug del hostname, enlaces a `app.` y a cada restaurante |

Los dos últimos los escribe `npm run prod:bootstrap` a partir del primero. Una regla de ESLint en el backend rechaza literales con el dominio.

## Procedimiento

1. **Cloudflare**: crear la zona del dominio nuevo, los registros de `infra/README.md` (sección 2) y un token `Zone:DNS:Edit` para esa zona.
2. **`.env` raíz**: `APP_DOMAIN=<nuevo>` y `CLOUDFLARE_API_TOKEN=<token nuevo>`.
3. **Zitadel**: el issuer de los tokens cambia con el dominio externo. Antes de reiniciar, agrega el dominio nuevo como dominio adicional de la instancia (consola → *Instance → Domains*) para que el login siga funcionando durante la transición.
4. **Reiniciar**: `docker compose up -d --force-recreate caddy zitadel-api zitadel-login`. Caddy obtiene el wildcard nuevo.
5. **Bootstrap**: `npm run prod:bootstrap`. Reescribe los `.env.production` con el dominio nuevo.
6. **Backend y frontend**: `npm run prod:up`.
7. **Redirect URIs**: `npm run prod:sync-redirects` agrega en la app SPA de Zitadel `https://<slug>.<nuevo>/callback` de cada restaurante activo (a partir de la tabla `tenants`) y `https://app.<nuevo>/callback`. Las URIs del dominio viejo se retiran a mano en la consola cuando termine la transición.
8. **Stripe**: actualizar la URL del webhook a `https://api.<nuevo>/api/billing/webhook`.
9. **Redirección del dominio viejo** durante 6 meses: agrega al Caddyfile un bloque

   ```
   *.<viejo>, <viejo> {
       tls { dns cloudflare {env.CLOUDFLARE_API_TOKEN_VIEJO} }
       redir https://{re.host.1}.<nuevo>{uri} permanent
   }
   ```

   con un `host_regexp` que capture el slug, o simplemente `redir https://app.<nuevo>{uri} permanent` si no hace falta conservar los subdominios.
10. **Sesiones**: los refresh tokens emitidos por el issuer viejo dejan de valer; los usuarios vuelven a iniciar sesión.
11. **Aviso a los restaurantes** con su nueva dirección `https://<slug>.<nuevo>`.

## Qué no cambia

- Los slugs y todos los datos en PostgreSQL.
- Las organizaciones, usuarios y roles en Zitadel (solo cambia el dominio externo).
- El código fuente.
