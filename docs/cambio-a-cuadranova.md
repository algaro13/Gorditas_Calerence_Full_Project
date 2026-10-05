# Cambio de marca y dominio: Kustodela → Cuadranova

«KUSTODELA» es marca registrada por un tercero en el IMPI (clase 42, expediente 3272036), así que el
producto pasa a llamarse **Cuadranova** y a vivir en `cuadranova.com` (comprado en Cloudflare, misma
cuenta y DNS que `kustodela.com`).

## Fase 1: código (rama `feat/cuadranova`)

Cambia lo que ve el cliente: la marca de los correos (`MARCA`), el remitente por omisión, el título
de la pestaña, la página de inicio, la consola, los textos legales (correos `@cuadranova.com`), los
nombres de los productos en `setup-stripe-products.ts` y el remitente que el bootstrap da a Zitadel.

Se queda igual, a propósito, porque nadie lo ve y cambiarlo rompería el servidor o los respaldos:
la base `kustodela`, el proyecto de Docker `kustodela`, las imágenes `kustodela/*`, el contenedor
`kustodela_router`, el bucket `kustodela-respaldo`, la carpeta del VPS y las cuentas de prueba
`@kustodela.local`.

## Fase 2: servidor (con respaldo antes)

1. **DNS en Cloudflare** (`cuadranova.com`): los mismos registros que hoy tiene `kustodela.com` para
   el VPS: la raíz y el comodín `*` proxied hacia 66.94.106.83.
2. **Certificado de origen** de Cloudflare para `cuadranova.com` y `*.cuadranova.com`, y el bloque
   del proxy (`infra/npm/kustodela.conf`) con `server_name` del dominio nuevo.
3. **Zitadel**, la parte delicada:
   - agregar el dominio nuevo a la instancia y cambiar el `ExternalDomain` a `auth.cuadranova.com`;
   - renombrar en la consola el proyecto «Kustodela POS» y su app SPA, y a la vez las constantes
     `PROJECT_NAME` y `SPA_APP_NAME` de `scripts/zitadel-bootstrap.ts` y `scripts/crear-operador.ts`
     (los scripts buscan el proyecto por ese nombre);
   - volver a registrar las direcciones de regreso de cada restaurante (`sync-redirect-uris`);
   - remitente SMTP: «Cuadranova», `no-reply@cuadranova.com`.
   Las cuentas y contraseñas se conservan; todos vuelven a iniciar sesión una vez.
4. **Correo**: dar de alta `cuadranova.com` en Resend (DKIM y SPF en Cloudflare) y repetir Email
   Routing con `contacto@` y `privacidad@`. En `.local/mailpit-relay.yaml`, la regla que bloquea los
   subdominios de prueba pasa a `@[a-z0-9-]+\.cuadranova\.com$`.
5. **Variables del VPS**: `APP_DOMAIN=cuadranova.com`, la dirección de Zitadel del backend y del
   frontend, `VITE_BRAND_NAME=Cuadranova` (está en `.env` y en el `.env` del frontend) y `SMTP_FROM`.
6. **Stripe**: webhook en `https://pos.cuadranova.com/api/billing/webhook`, sitio web del negocio,
   nombre en el estado de cuenta y el nombre de los tres productos.
7. **Redirección temporal** de `kustodela.com` y `*.kustodela.com` al dominio nuevo. Cuánto tiempo
   mantenerla lo decide el abogado, por la marca.
8. **Prueba completa**: registro, inicio de sesión, cobro de prueba, correos y consola.
