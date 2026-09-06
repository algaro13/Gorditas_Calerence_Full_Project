# Kustodela POS API

API del punto de venta multi-tenant para restaurantes. Express + TypeScript, PostgreSQL con Prisma y Row Level Security, identidad con Zitadel.

## Arranque local

Todo el entorno (PostgreSQL, Zitadel, correo capturado) se levanta desde la raíz del repositorio. Ver [docs/local-testing.md](../docs/local-testing.md).

```bash
npm run dev:up          # en la raíz: docker + bootstrap de Zitadel + migraciones
npm run dev:backend     # este API en http://localhost:5000
```

## Arquitectura

Módulos por contexto de negocio con cuatro capas y dependencias hacia adentro (verificadas por ESLint con `eslint-plugin-boundaries`):

```
src/
  main.ts / app.ts / container.ts     arranque, Express y composition root (inyección manual)
  shared/
    domain/         errores, dinero, roles, reglas de tenant y plan
    application/    puertos: UnitOfWork, Clock, Logger, IdentityProvider
    infrastructure/ Prisma (contexto de tenant, unidad de trabajo, contadores), logger, reloj
    http/express/   authenticate (jose + JWKS), tenantContext, planGuard, errorHandler, respond, serialize
    config/         env.ts (validación) y domain.ts (APP_DOMAIN, URLs, slugs reservados)
  modules/<contexto>/{domain,application,infrastructure,http}
  infrastructure/zitadel/   ZitadelIdentityProvider y FakeIdentityProvider
```

## Aislamiento de tenants

- Una sola base `kustodela`; toda tabla de negocio tiene `tenant_id` con `DEFAULT current_tenant_id()`.
- Row Level Security forzada en cada tabla (`prisma/sql/rls.sql`). El rol de runtime `pos_app` no tiene `BYPASSRLS`.
- Cada request corre dentro de una transacción con `SET LOCAL app.tenant_id` (`PrismaUnitOfWork`). Los repositorios usan `currentDb()`; fuera de una transacción de tenant lanzan `No tenant context`.
- Claves foráneas compuestas `(tenant_id, id)`: la base rechaza referencias cruzadas.

## Autenticación

- Tokens JWT de Zitadel validados contra su JWKS (`jose`). `orgId` = `urn:zitadel:iam:user:resourceowner:id`; roles desde el claim del proyecto filtrados por organización.
- Roles: `Admin`, `Encargado`, `Mesero`, `Despachador`, `Cocinero`. Guards: `isAdmin`, `isEncargado`, `isMesero`, `isDespachador`, `isCocinero`.
- El tenant se resuelve por `tenants.zitadel_org_id`; sin tenant → 404 `NO_TENANT`; inactivo → 403 `TENANT_INACTIVE`.
- `planGuard` bloquea las rutas de negocio con 403 `TRIAL_EXPIRED` o `SUBSCRIPTION_INACTIVE`.

## Configuración

Variables en `.env.<NODE_ENV>` (las escribe `scripts/zitadel-bootstrap.ts` en local). Ver `src/shared/config/env.ts` para la lista completa y valores por defecto. El dominio se define una sola vez en `APP_DOMAIN`; ningún archivo debe contener el dominio literal.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | ts-node-dev con `.env.development` |
| `npm run build` | `prisma generate` + `tsc` a `dist/` |
| `npm run migrate:dev` | `prisma migrate dev` (crea migraciones) |
| `npm run migrate:deploy` | aplica migraciones a la base de desarrollo |
| `npm run migrate:test` | aplica migraciones a `kustodela_test` |
| `npm run lint` | ESLint (incluye reglas de arquitectura) |
| `npm run typecheck` | `tsc --noEmit` sobre src, test y scripts |
| `npm run test:unit` | pruebas sin base de datos |
| `npm test` | unit + integración + e2e (requiere `dev:up`) |

## Migraciones

`prisma/migrations/0001_init/migration.sql` = `prisma/sql/functions.sql` + tablas generadas por Prisma + `prisma/sql/rls.sql`. Al agregar una tabla con `tenant_id`, inclúyela en la lista de `rls.sql` y vuelve a ejecutarlo dentro de la nueva migración (es idempotente).
