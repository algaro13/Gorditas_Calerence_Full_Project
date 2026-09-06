## 1. Entorno local

- [x] 1.1 Crear `docker-compose.dev.yaml` con `postgres`, `zitadel-api`, `zitadel-login`, `zitadel-proxy` (Caddy), `mailpit` (y `pgweb` opcional) y volumen `postgres_dev_data` + bind `.local/zitadel-bootstrap`
- [x] 1.2 Crear `infra/postgres/init/01-roles.sh` que cree bases `kustodela`, `kustodela_test`, `zitadel` y roles `pos_migrator`, `pos_app` (NOBYPASSRLS), `zitadel`
- [x] 1.3 Crear `.env.example` raíz y `.env` local con contraseñas de desarrollo
- [x] 1.4 Crear `scripts/zitadel-bootstrap.ts` idempotente (proyecto, roles, ajustes de proyecto, app SPA dev, SMTP a Mailpit, política de login, escritura de ids a `.env.development` y `.env.test`)
- [x] 1.5 Crear `package.json` raíz con `dev:up`, `dev:down`, `dev:reset`, `dev:seed` (placeholder hasta el change de onboarding), `test`, `test:unit`
- [x] 1.6 Escribir `docs/local-testing.md`

## 2. Esqueleto del backend

- [x] 2.1 Actualizar `package.json` del backend: agregar Prisma, jose, pino, express-rate-limit, vitest, supertest, eslint-plugin-boundaries; quitar mongoose, bcryptjs, jsonwebtoken, jwks-rsa; scripts `migrate:*`, `test`, `test:unit`, `dev` sin `NODE_TLS_REJECT_UNAUTHORIZED`
- [x] 2.2 Crear estructura `src/shared/{domain,application,infrastructure,http,config,utils}`, `src/modules/*`, `src/infrastructure`, `src/container.ts`, `src/app.ts`, `src/main.ts`
- [x] 2.3 Configurar `eslint.config.mjs` con `eslint-plugin-boundaries` y regla contra dominios literales
- [x] 2.4 Crear `src/shared/config/env.ts` (validación al arrancar) y `src/shared/config/domain.ts` (`APP_DOMAIN`, `tenantUrl`, `slugFromHost`, `RESERVED_SLUGS`)

## 3. Datos

- [x] 3.1 Escribir `prisma/schema.prisma` completo (tenants, stripe_events, tenant_users, counters, catálogos, órdenes y detalles) con enums, `tenant_id` por defecto, FKs compuestas e índices
- [x] 3.2 Generar migración inicial `0001_init` = `functions.sql` + tablas + `rls.sql` (función, RLS + FORCE, políticas, grants)
- [x] 3.3 Crear `src/shared/infrastructure/prisma/{client,tenant-context,unit-of-work,counters}.ts`
- [x] 3.4 Crear `src/shared/domain/{Result,DomainError,Money,Auth,Tenant}.ts` y `src/shared/application/ports/{UnitOfWork,Clock,Logger,IdentityProvider}.ts`
- [x] 3.5 Pruebas de integración `test/integration/rls.test.ts` y `counters.test.ts` contra `kustodela_test`

## 4. Autenticación

- [x] 4.1 Crear `src/shared/http/express/authenticate.ts` (jose, JWKS remoto o local, `rolesForOrg`, `authorize`, `isAdmin`...)
- [x] 4.2 Crear `src/shared/http/express/tenant-context.ts` (tenant por `orgId`, caché, `NO_TENANT`, `activo`, espejo de miembros) y `plan-guard.ts` estricto
- [x] 4.3 Crear `src/shared/http/express/{error-handler,respond,serialize,async-handler}.ts`
- [x] 4.4 Crear puerto `IdentityProvider` y adaptadores `ZitadelIdentityProvider` (endpoints según protos v4.17) y `FakeIdentityProvider`
- [x] 4.5 Pruebas: `test/helpers/auth.ts` (JWKS local + `SignJWT`), `test/e2e/auth.test.ts`, `test/e2e/plan-guard.test.ts`, `test/e2e/isolation.test.ts`

## 5. Limpieza y verificación

- [x] 5.1 Eliminar `src/models`, `src/config`, `src/middleware`, `src/routes`, `src/utils`, `src/types`, `src/server.ts(x)`, `src/index.ts`, `seed.ts`, `scripts/migrate-first-tenant.ts`, `scripts/fix-tenant-plan.js`, `appsettings*.json`, `.bolt`, logos subidos; `.gitignore` con `uploads/` y `.env*`
- [x] 5.2 `src/main.ts`/`src/app.ts` montan `/health`, `/api/tenants` y los middlewares nuevos (las rutas de negocio se montan en changes siguientes)
- [x] 5.3 `npm run build`, `npm run lint`, `npm test` en verde (15 unit + 11 integración + 18 e2e); `dev:up` desde cero en Windows; prueba de humo con token JWT real de Zitadel (client credentials) contra `/api/tenants/me`: 401 con token inválido, 404 `NO_TENANT` sin tenant, 200 con tenant vinculado y espejo en `tenant_users`
