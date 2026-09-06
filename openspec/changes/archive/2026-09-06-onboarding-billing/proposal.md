## Why

Con los módulos de negocio portados, faltan las dos capacidades que hacen del POS un SaaS: el registro de restaurantes nuevos (onboarding) y el cobro de la suscripción (billing). El onboarding anterior dependía de Entra y de crear una base MongoDB por tenant; el billing aceptaba webhooks sin verificar firma y sus escrituras se perdían por el esquema. Esta fase los reimplementa sobre Zitadel, PostgreSQL y el `PaymentProvider`.

## What Changes

- **Onboarding público** (`POST /api/onboarding/complete`): un solo paso crea la organización en Zitadel con su administrador (nombre, correo, contraseña), le otorga el proyecto y el rol Admin, registra las redirect URIs del subdominio, crea el tenant en trial de 14 días y siembra el catálogo inicial (mesas, "Nuevo pedido", tipos, productos y extras de ejemplo, guisos y platillos del wizard). Rollback de la organización si falla la base. Rate limit por IP.
- **Subida de logo**: `POST /api/onboarding/upload-image` (público, a carpeta temporal) y `POST /api/tenants/me/logo` (autenticado, a la carpeta del tenant). Archivos bajo `UPLOADS_DIR/<tenantId>/`, nunca por slug.
- **Configuración del tenant**: `PUT /api/tenants/me/config` (Admin) valida paleta e imagen e invalida la caché del tenant.
- **Billing**: `POST /api/billing/webhook` con body crudo y firma obligatoria, deduplicación por `stripe_events`, plan derivado del `price.id` de la suscripción (no de metadata), manejo de `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`; `POST /create-checkout`, `POST /create-portal`, `GET /status`, `GET /plans`. URLs de retorno construidas desde `APP_DOMAIN`, no desde `Origin`.
- Puertos `PaymentProvider` y `WebhookVerifier` con adaptador Stripe y falso para pruebas.

## Capabilities

### New Capabilities
- `tenant-onboarding`: registro público de un restaurante con su administrador y catálogo inicial.
- `tenant-branding`: logo y paleta por tenant.
- `stripe-billing`: suscripciones con Stripe Checkout, portal y webhooks verificados.

### Modified Capabilities
- `plan-enforcement`: el límite de usuarios y el estado del plan se actualizan desde los webhooks verificados.

## Impact

- **Backend**: `src/modules/onboarding`, `src/modules/billing`, ampliación de `src/modules/tenants`, `src/infrastructure/stripe`, montaje del webhook antes de `express.json` en `src/app.ts`.
- **Esquema**: sin cambios (los campos ya existen en `tenants` y `stripe_events`).
- **Frontend**: el wizard debe enviar la cuenta del administrador y redirigir al subdominio (change de frontend).
- **Dependencias**: `stripe` (ya presente), `express-rate-limit`, `multer` (ya presentes).
