## Context

Fase de fundación de la migración descrita en el plan aprobado. Cubre entorno local, capa de datos con RLS, autenticación con Zitadel y el esqueleto de arquitectura. Las rutas de negocio (órdenes, catálogos, reportes, onboarding, billing) se migran en changes posteriores sobre esta base.

## Goals / Non-Goals

**Goals**
- Ninguna consulta de negocio puede ejecutarse sin contexto de tenant; la base rechaza filas cruzadas.
- Todo el sistema arranca en localhost con docker sin depender del VPS ni de Cloudflare.
- El dominio y todos los ids de Zitadel viven en variables de entorno.

**Non-Goals**
- Migrar datos de MongoDB.
- Reescribir las rutas de negocio o el frontend (changes siguientes).
- Configurar producción (Caddy, DNS) en esta fase.

## Decisions

- **Ids**: catálogos con `Int autoincrement` global expuestos como `_id: number`; órdenes y detalles con `uuid`. RLS impide ver ids ajenos, así que no hace falta numeración por tenant.
- **RLS**: función `current_tenant_id()` que lee `current_setting('app.tenant_id', true)`; políticas `USING`/`WITH CHECK` en cada tabla con `FORCE ROW LEVEL SECURITY`; `tenant_id` con `DEFAULT current_tenant_id()` para que la aplicación nunca lo escriba; FKs compuestas `(tenant_id, id)` porque las verificaciones de FK ignoran RLS.
- **Contexto**: `withTenant(fn)` abre una transacción interactiva de Prisma y ejecuta `set_config('app.tenant_id', <id>, true)` (SET LOCAL) en la conexión fija; se expone como el puerto `UnitOfWork`.
- **Roles Postgres**: `pos_migrator` dueño del esquema (usado por `DIRECT_URL`), `pos_app` NOBYPASSRLS (usado por `DATABASE_URL`). `FORCE` aplica también al dueño.
- **Tokens**: access token JWT de Zitadel validado con `jose.createRemoteJWKSet`; `orgId` desde `urn:zitadel:iam:user:resourceowner:id`; roles desde `urn:zitadel:iam:org:project:<PROJECT_ID>:roles` filtrados por `orgId`. En pruebas, JWKS local y tokens firmados con `SignJWT`.
- **Zitadel local**: `ZITADEL_EXTERNALDOMAIN=localhost`, `EXTERNALSECURE=false`, `--tlsMode disabled`; PAT del usuario máquina escrito a un volumen compartido y leído por `scripts/zitadel-bootstrap.ts`, que crea proyecto, roles, apps y SMTP hacia Mailpit de forma idempotente.
- **Arquitectura**: módulos con `domain/application/infrastructure/http`; DI manual en `src/app.ts`; `eslint-plugin-boundaries` prohíbe importar hacia afuera.
- **Dominio configurable**: `shared/config/domain.ts` con `APP_DOMAIN`, `tenantUrl`, `slugFromHost`, `RESERVED_SLUGS`; regla ESLint contra literales que contengan el nombre del dominio.

## Risks / Trade-offs

- Cada request abre una transacción, incluso lecturas: costo despreciable a escala POS; `connection_limit=15`.
- Los endpoints v2 de la Management API de Zitadel marcados "verificar" en el plan se confirman contra la documentación de la versión fijada antes de implementarlos.
- Zitadel en Windows con Docker Desktop tarda en el primer arranque (init de esquema): `dev:up` espera al healthcheck.

## Migration Plan

1. Levantar `docker-compose.dev.yaml` y ejecutar el bootstrap.
2. `prisma migrate deploy` crea el esquema y aplica `rls.sql`.
3. Las rutas legacy dejan de montarse; el servidor arranca solo con `/health` y los middlewares nuevos hasta que los módulos de negocio se migren en los changes siguientes.

## Open Questions

- Ninguna bloqueante. Los nombres exactos de las variables `LOGINV2` del compose de Zitadel se copian del repositorio oficial en la versión fijada.
