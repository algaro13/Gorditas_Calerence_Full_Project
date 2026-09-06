## Context

Última fase del plan. El VPS corre Docker; el dominio está en Cloudflare (DNS only para los registros del POS, sin proxy naranja, porque Zitadel y el API necesitan h2c/gRPC directo y el certificado lo emite Let's Encrypt en Caddy).

## Goals / Non-Goals

**Goals**
- `git pull && npm run prod:up` levanta todo; el único paso manual de Zitadel es el SMTP real y cambiar la contraseña del admin.
- Ningún secreto ni dominio en archivos versionados.
- Respaldo diario restaurable de ambas bases.

**Non-Goals**
- Alta disponibilidad o varias réplicas.
- CI/CD hacia el VPS (se documenta el `git pull` manual).

## Decisions

- **Un solo compose de producción** en la raíz. Los secretos viven en `.env` (raíz, no versionado); los ids de Zitadel en `Gorditas_Calerence_Backend/.env.production` y `Gorditas_frontend/project/.env.production`, escritos por `zitadel-bootstrap --env production`. Las URLs de base de datos del backend las inyecta el compose (host `postgres`), y como `process.env` tiene prioridad sobre los `.env.*`, no hay que duplicarlas.
- **Zitadel en producción**: `--tlsMode external`, `EXTERNALSECURE=true`, `EXTERNALPORT=443`, `EXTERNALDOMAIN=auth.<APP_DOMAIN>`; el Login v2 recibe `X-Forwarded-Proto: https`. El PAT del usuario máquina se escribe en `./.local/zitadel-bootstrap` (bind mount, fuera de git), igual que en local, para que el bootstrap lo lea sin copiarlo a mano.
- **Caddy**: imagen construida con `xcaddy` y `github.com/caddy-dns/cloudflare`. Un bloque `*.{$APP_DOMAIN}, {$APP_DOMAIN}` con `tls { dns cloudflare {env.CLOUDFLARE_API_TOKEN} }`; los `handle` por host se evalúan en orden: `auth`, `api`, `app`, después el wildcard de tenants (regex sobre el host), y `404` para lo demás. Se agrega `www` → redirección a `app`.
- **Frontend**: el contenedor `frontend-build` es de un solo disparo (`restart: "no"`): `npm run build` con `.env.production` como `env_file` y copia `dist` al volumen `pos_dist`. Reconstruir = `docker compose run --rm frontend-build`. Así los ids del bootstrap llegan al bundle sin `build.args` duplicados.
- **Backend**: `Dockerfile` existente (migra y arranca). Volumen `uploads` para los logos. `depends_on` de `postgres` saludable y de `zitadel-api` saludable.
- **Respaldos**: `prodrigestivill/postgres-backup-local` con `POSTGRES_MULTIPLE_DATABASES=kustodela,zitadel` (rol `postgres`), diario, 14 días, en el volumen `backups` (montado en `./backups`, ignorado por git). Restauración documentada con `pg_restore`.
- **Firewall**: solo 22 (restringido), 80 y 443. Postgres y Zitadel no publican puertos.
- **Cambio de dominio**: una sola variable (`APP_DOMAIN`) en el `.env` raíz; el procedimiento vive en `docs/cambiar-dominio.md`.

## Risks / Trade-offs

- La emisión del wildcard depende del token de Cloudflare con permiso `Zone:DNS:Edit` de la zona; sin él Caddy no arranca con TLS. Se documenta cómo probar con `ACME_STAGING=true`.
- Zitadel toma 30-60 s en el primer arranque; el bootstrap espera al `.well-known`.
- El script de bootstrap en producción se ejecuta desde el propio VPS (necesita Node 22 y `npx tsx`), o desde una máquina con acceso HTTPS a `auth.<APP_DOMAIN>` y el PAT copiado a `ZITADEL_PAT`.

## Migration Plan

1. DNS y token en Cloudflare; `.env` en el VPS.
2. `npm run prod:up` (postgres, zitadel, caddy). 3. `npm run prod:bootstrap`. 4. `npm run prod:up` de nuevo (backend y frontend con los ids). 5. SMTP real, contraseña del admin, webhook de Stripe. 6. Retirar los registros DNS antiguos y las claves de Stripe expuestas.

## Open Questions

Ninguna.
