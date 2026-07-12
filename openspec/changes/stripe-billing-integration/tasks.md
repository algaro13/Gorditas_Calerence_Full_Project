## 1. Setup y configuración de Stripe

- [x] 1.1 Instalar `stripe` como dependencia del backend
- [x] 1.2 Agregar claves de Stripe al `appsettings.json` y `.env` (secretKey, publishableKey, webhookSecret)
- [x] 1.3 Crear script `scripts/setup-stripe-products.ts` que cree los 3 productos y precios en Stripe (Básico $299, Profesional $599, Empresarial $999 MXN/mes)
- [ ] 1.4 Ejecutar el script y guardar los Price IDs generados en la configuración

## 2. Modelo de datos

- [x] 2.1 Agregar campos al schema Tenant en master DB: `stripeCustomerId`, `stripeSubscriptionId`, `planStatus`, `trialEndsAt`, `maxUsuarios`
- [x] 2.2 Actualizar el script de migración del primer tenant para incluir los campos nuevos (trial activo)

## 3. Backend — Rutas de billing

- [x] 3.1 Crear `src/routes/billing.ts` con endpoint `POST /api/billing/create-checkout` que cree una Checkout Session de Stripe con el plan seleccionado
- [x] 3.2 Crear endpoint `POST /api/billing/webhook` que procese eventos de Stripe (checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted)
- [x] 3.3 Crear endpoint `POST /api/billing/create-portal` que genere una sesión del Customer Portal de Stripe
- [x] 3.4 Crear endpoint `GET /api/billing/status` que retorne el estado de suscripción del tenant actual
- [x] 3.5 Registrar la ruta `/api/billing` en `server.ts`

## 4. Middleware de verificación de plan

- [ ] 4.1 Crear `src/middleware/plan-guard.ts` que verifique `planStatus` y `trialEndsAt` antes de procesar requests del POS
- [ ] 4.2 Integrar `plan-guard` en las rutas del POS (ordenes, inventario, reportes, catalogos) — pero NO en billing ni tenants

## 5. Frontend — Página de planes

- [x] 5.1 Crear página `src/pages/Plans.tsx` con las 3 opciones de plan, precios y botón "Seleccionar"
- [x] 5.2 Integrar llamada a `POST /api/billing/create-checkout` y redirect a Stripe Checkout
- [x] 5.3 Crear página `src/pages/BillingSuccess.tsx` para el return de Stripe Checkout
- [ ] 5.4 Agregar botón "Gestionar suscripción" en el header/settings que abra el Customer Portal
- [ ] 5.5 Agregar ruta `/planes` y `/billing/success` al router

## 6. Verificación

- [ ] 6.1 Verificar que el script crea los productos en Stripe (modo test)
- [ ] 6.2 Verificar flujo completo: seleccionar plan → Stripe Checkout → webhook → tenant activo
- [ ] 6.3 Verificar que un tenant con trial expirado recibe 403
- [ ] 6.4 Verificar que el Customer Portal funciona
- [ ] 6.5 Verificar que el proyecto compila sin errores
