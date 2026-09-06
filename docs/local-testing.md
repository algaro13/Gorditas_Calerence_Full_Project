# Entorno local de desarrollo y pruebas

Todo el sistema corre en `localhost` sin tocar el VPS ni Cloudflare.

## Requisitos

- Docker Desktop (con Compose v2)
- Node.js 22 o superior
- Stripe CLI (opcional, para probar webhooks)

## Arranque

```bash
cp .env.example .env          # solo la primera vez
npm install                   # instala tsx/rimraf en la raíz
npm run dev:up
```

`dev:up` hace tres cosas:

1. Levanta `docker-compose.dev.yaml` y espera a que todo esté sano.
2. Ejecuta `scripts/zitadel-bootstrap.ts`, que crea en Zitadel el proyecto "Kustodela POS", los cinco roles, la app SPA de desarrollo, el SMTP hacia Mailpit y deshabilita el auto-registro. Escribe los ids en `Gorditas_Calerence_Backend/.env.development` y `Gorditas_frontend/project/.env.development`.
3. Aplica las migraciones de Prisma sobre la base `kustodela`.

Luego, en dos terminales:

```bash
npm run dev:backend    # Express en http://localhost:5000
npm run dev:frontend   # Vite en http://localhost:5173
```

## Servicios

| Servicio | URL | Credenciales |
|---|---|---|
| Zitadel (consola) | http://localhost:8080/ui/console | `admin` / `ZITADEL_ADMIN_PASSWORD` del `.env` |
| Zitadel (OIDC) | http://localhost:8080/.well-known/openid-configuration | |
| Mailpit (correos capturados) | http://localhost:8025 | |
| PostgreSQL | `localhost:5432` | `postgres` / `POSTGRES_ADMIN_PASSWORD`; bases `kustodela`, `kustodela_test`, `zitadel` |
| pgweb (opcional) | http://localhost:8081 | `npm run dev:tools` |

Roles de PostgreSQL: `pos_migrator` (migraciones, `DIRECT_URL`) y `pos_app` (runtime sin `BYPASSRLS`, `DATABASE_URL`).

## Multi-tenant en localhost

En producción el restaurante se identifica por el subdominio `<slug>.<APP_DOMAIN>`. En local no hay subdominios, así que el frontend lee el slug de `localStorage.devTenantSlug`. `npm run dev:seed` crea el restaurante `demo` y fija ese valor.

## Pruebas

```bash
npm run test:unit   # dominio y casos de uso, sin docker
npm test            # unit + integración (kustodela_test) + e2e (JWKS local, Zitadel falso)
```

## Stripe en local

```bash
stripe listen --forward-to localhost:5000/api/billing/webhook
stripe trigger checkout.session.completed
```

## Comandos útiles

```bash
npm run dev:logs       # logs de todos los contenedores
npm run dev:bootstrap  # re-ejecutar solo el bootstrap de Zitadel (es idempotente)
npm run dev:down       # apagar conservando datos
npm run dev:reset      # apagar y borrar volúmenes y PATs (.local/)
```

## Problemas conocidos

- Primer arranque de Zitadel: tarda 30-60 s en inicializar su esquema. `dev:up` espera al healthcheck.
- Si cambias `ZITADEL_MASTERKEY` después del primer arranque, la base de Zitadel queda inservible: haz `dev:reset`.
- En Windows, `infra/postgres/init/01-roles.sh` debe tener finales de línea LF (el repo lo fuerza con `.gitattributes`).
