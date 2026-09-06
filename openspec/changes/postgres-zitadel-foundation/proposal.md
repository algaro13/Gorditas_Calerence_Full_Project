## Why

El backend actual aísla tenants cerrando y reconectando la conexión global de Mongoose en cada request (`tenant-models-middleware.ts`), lo que mezcla datos entre restaurantes bajo concurrencia. Además, una base MongoDB por tenant choca con el límite recomendado de ~1000 archivos por nodo a partir de 15-20 restaurantes, el login depende de Microsoft Entra con ids incrustados en el código y no existe un entorno local reproducible. Esta es la primera fase (fundación) de la migración aprobada a PostgreSQL + Prisma con Row Level Security y a Zitadel autohospedado.

## What Changes

- Entorno local completo en docker (`docker-compose.dev.yaml`): PostgreSQL, Zitadel, Zitadel Login v2 y Mailpit, con bootstrap automático de Zitadel y comandos `dev:up`, `dev:seed`, `dev:down`, `dev:reset`.
- Esquema Prisma para una sola base `kustodela` con `tenant_id` en toda tabla de negocio, claves foráneas compuestas y Row Level Security forzada mediante `current_tenant_id()`; roles Postgres `pos_migrator` (migraciones) y `pos_app` (runtime, sin BYPASSRLS).
- Contexto de tenant con `AsyncLocalStorage` y transacción con `SET LOCAL app.tenant_id` (`UnitOfWork`), expuesto a la capa de aplicación sin conocimiento de RLS.
- Autenticación con tokens JWT de Zitadel validados vía JWKS (`jose`), roles por organización extraídos de los claims, y adaptador `IdentityProvider` para la Management API de Zitadel con un `FakeIdentityProvider` para pruebas.
- Esqueleto de arquitectura limpia (`src/shared`, `src/modules/*` con `domain/application/infrastructure/http`) con reglas de dependencia verificadas por ESLint, y configuración de dominio centralizada (`APP_DOMAIN`, `RESERVED_SLUGS`).
- **BREAKING**: se elimina la conexión a MongoDB, los modelos Mongoose, el login legacy con JWT propio y la integración con Microsoft Entra. No se migran datos (decisión del usuario: empezar de cero).

## Capabilities

### New Capabilities
- `local-dev-environment`: entorno de desarrollo y pruebas reproducible en docker con identidad y correo locales.
- `tenant-data-isolation`: aislamiento de datos por tenant garantizado por PostgreSQL (RLS) y contexto de tenant por request.
- `zitadel-authentication`: autenticación y autorización basadas en tokens de Zitadel con una organización por restaurante.

### Modified Capabilities
- `entra-authentication`: se reemplaza por completo por `zitadel-authentication`.
- `tenant-management`: el registro maestro de tenants pasa de `kustodela_master` (Mongo) a la tabla `tenants` en PostgreSQL.

## Impact

- **Backend**: nuevo `prisma/schema.prisma`, migración inicial con RLS, `src/shared/*`, `src/modules/*` (esqueleto), `src/app.ts`, `src/main.ts`; se eliminan `src/models`, `src/config/*-db.ts`, `src/middleware/hybrid-auth.ts` y afines.
- **Dependencias**: se agregan `@prisma/client`, `prisma`, `jose`, `pino`, `express-rate-limit`, `vitest`, `supertest`, `eslint-plugin-boundaries`; se quitan `mongoose`, `bcryptjs`, `jsonwebtoken`, `jwks-rsa`.
- **Infra local**: `docker-compose.dev.yaml`, `infra/postgres/init/`, `scripts/zitadel-bootstrap.ts`.
- **Frontend**: sin cambios en esta fase (se aborda en un change posterior); el API mantiene el contrato JSON.
