## Why

Las fases anteriores dejaron backend y frontend funcionando en local contra PostgreSQL y Zitadel. Para el corte en el VPS falta la infraestructura de producción: el `docker-compose.yaml` actual todavía levanta MongoDB y las imágenes viejas, `nginx/` tiene la configuración del esquema `pos-<slug>` y no existe forma de obtener el certificado wildcard ni respaldos.

## What Changes

- **`docker-compose.yaml` de producción** (reemplaza el de Mongo): `postgres`, `zitadel-api`, `zitadel-login`, `backend` (build), `frontend-build` (construye el SPA con `.env.production` y publica `dist` en un volumen), `caddy` (imagen propia con el módulo DNS de Cloudflare) y `pg-backup` (respaldo diario de `kustodela` y `zitadel`). Solo Caddy expone puertos (80/443).
- **Caddy**: `infra/caddy/Dockerfile` (xcaddy + `caddy-dns/cloudflare`) y `infra/caddy/Caddyfile` parametrizado con `{$APP_DOMAIN}`: `auth.` → Zitadel (login v2 y API h2c), `api.` → backend, `app.` y `<slug>.` → SPA estática, wildcard TLS por DNS-01.
- **Frontend**: el `Dockerfile` construye en tiempo de ejecución del contenedor leyendo `Gorditas_frontend/project/.env.production` (escrito por el bootstrap) y copia `dist` al volumen que sirve Caddy.
- **Variables**: `.env.example` raíz gana la sección de producción (`ACME_EMAIL`, `CLOUDFLARE_API_TOKEN`, Stripe, respaldos); `Gorditas_Calerence_Backend/.env.example` documenta el archivo que genera el bootstrap.
- **Scripts raíz** `prod:up`, `prod:bootstrap`, `prod:build-frontend`, `prod:logs`, `prod:backup`, `prod:down`.
- **Documentación**: `infra/README.md` (DNS en Cloudflare, firewall, secretos, primer arranque, actualizaciones, respaldo y restauración, rotación de claves de Stripe) y `docs/cambiar-dominio.md`.
- Se elimina `nginx/`.

## Capabilities

### New Capabilities
- `production-deployment`: despliegue reproducible en un VPS con TLS wildcard, un solo origen por servicio y respaldos.

### Modified Capabilities
- `local-dev-environment`: el bootstrap `--env production` documenta el flujo del VPS.

## Impact

- Archivos: `docker-compose.yaml`, `infra/caddy/{Dockerfile,Caddyfile}`, `Gorditas_frontend/Dockerfile`, `.env.example`, `Gorditas_Calerence_Backend/.env.example`, `package.json`, `infra/README.md`, `docs/cambiar-dominio.md`, `nginx/` (eliminado).
- Acciones manuales del operador (no automatizables desde el repo): registros DNS y token en Cloudflare, secretos del `.env` del VPS, SMTP real en Zitadel, webhook y rotación de claves en Stripe.
