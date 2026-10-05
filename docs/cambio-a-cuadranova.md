# Cambio de marca y dominio: Kustodela → Cuadranova

«KUSTODELA» es marca registrada por un tercero en el IMPI (clase 42, expediente 3272036), así que el
producto pasa a llamarse **Cuadranova** y a vivir en `cuadranova.com` (comprado en Cloudflare, misma
cuenta y DNS que `kustodela.com`).

## Fase 1: código (rama `feat/cuadranova`) ✅

Cambia lo que ve el cliente: la marca de los correos (`MARCA`), el remitente por omisión, el título
de la pestaña, la página de inicio, la consola, los textos legales (correos `@cuadranova.com`), los
nombres de los productos en `setup-stripe-products.ts` y el remitente que el bootstrap da a Zitadel.

Se queda igual, a propósito, porque nadie lo ve y cambiarlo rompería el servidor o los respaldos:
la base `kustodela`, el proyecto de Docker `kustodela`, las imágenes `kustodela/*`, el contenedor
`kustodela_router`, el bucket `kustodela-respaldo`, la carpeta del VPS y las cuentas de prueba
`@kustodela.local`.

## Correo de `cuadranova.com` ✅

- **Envío**: dominio verificado en Resend (us-east-1). DNS: `send` y `rsend` (CNAME a
  `*.forge.rmta.net`), `resend._domainkey` (DKIM) y `_dmarc` (`v=DMARC1; p=none;`). Todos en «Solo DNS».
- **Recepción**: Cloudflare Email Routing; `contacto@` y `privacidad@` reenvían al Gmail del
  responsable. «Enable Receiving» de Resend queda apagado para no chocar en los MX de la raíz.

## Ensayo en local (5 de octubre de 2026)

Con Zitadel v4.17.3 (`start-from-init`, que vuelve a correr el setup en cada arranque):

1. Cambiar `ZITADEL_EXTERNAL_DOMAIN` y recrear `zitadel-api` y `zitadel-login` basta para que Zitadel
   responda en el dominio nuevo con su issuer. **No hay que agregar el dominio a mano** en la consola.
2. **El dominio viejo sigue funcionando a la vez**, con su propio issuer: los dos conviven durante la
   transición.
3. La dirección del Login v2 quedó guardada en la instancia cuando se creó
   (`ZITADEL_DEFAULTINSTANCE_FEATURES_*` solo aplica a instancias nuevas). Hay que cambiarla por API:

   ```bash
   curl -X PUT https://auth.<dominio>/v2/features/instance \
     -H "Authorization: Bearer $(cat .local/zitadel-bootstrap/backend.pat)" \
     -H "Content-Type: application/json" \
     -d '{"loginV2":{"required":true,"baseUri":"https://auth.<dominio>/ui/v2/login/"}}'
   ```

   Es global: después del cambio, el inicio de sesión de ambos dominios usa la pantalla del nuevo.
4. El regreso es el mismo camino al revés (variable, recrear, la misma llamada con el dominio viejo),
   y se comprobó con un inicio de sesión real de punta a punta.

## Fase 2: servidor

Montaje del VPS: Cloudflare (proxied) → Nginx Proxy Manager con certificado de origen de Cloudflare
(`infra/npm/kustodela.conf` en `<data de NPM>/nginx/custom/http.conf`) → `kustodela_router` (Caddy)
→ Zitadel, backend y SPA. Todo se deriva de `APP_DOMAIN`.

**Antes, en Cloudflare (dueño de la cuenta):**

1. DNS de `cuadranova.com`: la raíz y el comodín `*` hacia `66.94.106.83`, **proxied** (nube
   naranja), igual que `kustodela.com`. Los registros de correo se quedan en «Solo DNS».
2. SSL/TLS de la zona en el mismo modo que `kustodela.com`.
3. Certificado de origen (**SSL/TLS → Servidor de origen → Crear certificado**) para
   `cuadranova.com` y `*.cuadranova.com`. El certificado y la clave se guardan en `.local/` (git lo
   ignora) para subirlos al VPS; la clave no se pega en ningún chat.

**En el VPS (con respaldo antes: `pg-backup` y `respaldar.sh`):**

1. Fusionar `feat/cuadranova` en la rama del VPS y `git pull --ff-only`.
2. Certificado nuevo en `/data/custom_ssl/` de NPM y un segundo bloque `server` con
   `server_name *.cuadranova.com cuadranova.com` (copia del de `kustodela.com`). Recargar nginx de NPM.
3. Variables, con copia de cada archivo antes:
   - `.env` raíz: `APP_DOMAIN=cuadranova.com`.
   - `Gorditas_Calerence_Backend/.env.production`: `APP_DOMAIN`, `ZITADEL_ISSUER`,
     `ZITADEL_JWKS_URL`, `ZITADEL_API_URL` y `FRONTEND_BASE_URL` con el dominio nuevo.
   - `Gorditas_frontend/project/.env.production`: `VITE_APP_DOMAIN`, `VITE_API_URL`,
     `VITE_ZITADEL_AUTHORITY` con el dominio nuevo y `VITE_BRAND_NAME=Cuadranova`.
4. Recrear: `zitadel-api`, `zitadel-login` y `caddy` (`--force-recreate`), luego `backend` y el build
   del frontend.
5. Login v2: la llamada del ensayo con `https://auth.cuadranova.com/ui/v2/login/`.
6. Redirect URIs: `sync-redirect-uris.ts` dentro del contenedor del backend. Agrega las del dominio
   nuevo sin borrar las viejas.
7. Zitadel, en la consola: remitente SMTP «Cuadranova» `no-reply@cuadranova.com`. Opcional: renombrar
   el proyecto «Kustodela POS» y su app, cambiando a la vez `PROJECT_NAME` y `SPA_APP_NAME` en
   `scripts/zitadel-bootstrap.ts` y `scripts/crear-operador.ts` (los scripts lo buscan por nombre).
8. Mailpit: en `.local/mailpit-relay.yaml`, `blocked-recipients` pasa a
   `@[a-z0-9-]+\.cuadranova\.com$`.
9. Stripe: webhook con la dirección nueva, sitio web del negocio, nombre en el estado de cuenta y
   nombre de los tres productos.
10. Prueba completa en el navegador: registro, inicio de sesión, cobro de prueba, correos y consola.
11. Redirección del dominio viejo en NPM: `*.kustodela.com` → el mismo subdominio en
    `cuadranova.com` (301) y `kustodela.com` → `cuadranova.com`. Cuánto tiempo mantenerla lo decide
    el abogado, por la marca. Al terminar, retirar en Zitadel las redirect URIs viejas.

**Regreso**, si algo falla: restaurar las copias de los tres archivos de variables, recrear los mismos
contenedores, la llamada del Login v2 con `auth.kustodela.com` y quitar el bloque de NPM nuevo.
