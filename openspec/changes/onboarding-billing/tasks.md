## 1. Tenants (branding)

- [x] 1.1 Ampliar `TenantRepository` (updateConfig, updateBilling, findByStripeSubscriptionId, setStripeCustomerId, create, delete, setProvisioningStatus)
- [x] 1.2 `shared/infrastructure/storage/LocalFileStorage.ts` (guardar tmp, mover a tenant, validar MIME y tamaño) y `shared/http/express/upload.ts` (multer en memoria, 2 MB, JPEG/PNG/WebP)
- [x] 1.3 Rutas `PUT /api/tenants/me/config` (Admin, valida paleta e imagen, invalida caché) y `POST /api/tenants/me/logo`
- [x] 1.4 Pruebas e2e de configuración y logo

## 2. Onboarding

- [x] 2.1 `modules/onboarding/infrastructure/seed-tenant.ts` (semilla portada del legacy + datos del wizard)
- [x] 2.2 Caso de uso `RegistrarRestaurante` (validación, identidad, redirect URIs, transacción, logo, rollback) y `SubirLogoTemporal`
- [x] 2.3 Router público con rate limit: `POST /upload-image`, `POST /complete`; invalidación de la caché de tenant por orgId
- [x] 2.4 Pruebas e2e con `FakeIdentityProvider`: registro completo, slug ocupado/reservado, contraseña débil, rollback ante fallo de base, límite de tasa

## 3. Billing

- [x] 3.1 Puertos `PaymentProvider` y `WebhookVerifier`; `StripePaymentProvider`, `StripeWebhookVerifier`, `FakePaymentProvider`; `StripeEventStore` (Prisma) ; catálogo de planes y `PRICE_TO_PLAN` desde env
- [x] 3.2 Casos de uso `CrearCheckout`, `CrearPortal`, `EstadoBilling`, `ProcesarWebhook` (dedupe + handlers por tipo)
- [x] 3.3 Router: webhook con `express.raw` montado antes de `express.json`; rutas autenticadas sin `planGuard`; `GET /plans` público
- [x] 3.4 Pruebas e2e: firma inválida, duplicado, checkout completado (plan por price id), subscription.updated/deleted, invoice.paid/payment_failed, create-checkout con trial vencido, plan inválido

## 4. Verificación

- [x] 4.1 `npm run lint`, `npm run typecheck`, `npm test` en verde
- [x] 4.2 Onboarding real contra el Zitadel local: `POST /api/onboarding/complete` crea la org y el admin; el admin aparece en la consola; correo de verificación en Mailpit
- [x] 4.3 `scripts/dev-seed.ts` implementado sobre `/api/onboarding/complete` (restaurante `demo`)
