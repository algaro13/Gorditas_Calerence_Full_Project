## Context

Tercera fase de la migración. Requiere: `IdentityProvider` (Zitadel), `TenantRepository`, `runAsTenant` para sembrar bajo RLS, y el middleware `tenantContext` con `invalidate(orgId)`.

## Goals / Non-Goals

**Goals**
- Un restaurante nuevo queda operativo con una sola llamada y puede iniciar sesión en su subdominio.
- Ningún evento de Stripe se procesa sin firma válida ni dos veces.
- El estado del plan en la base refleja siempre la suscripción real de Stripe.

**Non-Goals**
- Cambios en el wizard del frontend (change siguiente).
- Facturación CFDI, cupones o cambios de plan sin pasar por el portal de Stripe.

## Decisions

- **Onboarding público y atómico hacia afuera**: orden de pasos `createOrganizationWithAdmin → grantProjectToOrganization → assignRole(Admin) → registerRedirectUris → transacción DB (tenant + seed + espejo Admin) → mover logo`. Si la transacción falla se borra la organización (best effort) y se responde 500 con código `ONBOARDING_FAILED`; el slug queda libre.
- **Contraseña**: Joi exige 8+ caracteres con letra y número; la política real la aplica Zitadel (mayúscula, minúscula, número y símbolo). Un rechazo de Zitadel se responde como 400 `PASSWORD_POLICY`.
- **Semilla**: portada del legacy (tipos de platillo/producto/extra/gasto/orden, 3 bebidas, 5 extras, mesas + "Nuevo pedido"); guisos y platillos del wizard; los platillos se asignan al tipo "Gorditas" creado en la misma transacción.
- **Logos**: `uploads/tmp/<uuid>/logo.<ext>` en el paso público y `uploads/<tenantId>/logo.<ext>` al completar; la extensión se deriva del MIME, nunca del nombre original; límite 2 MB; el path público es `/uploads/<tenantId>/logo.<ext>`.
- **Webhook**: ruta montada con `express.raw({ type: 'application/json' })` antes de `express.json`. `WebhookVerifier.construct(rawBody, signature)`; sin `STRIPE_WEBHOOK_SECRET` el servidor no arranca en modo stripe. Dedupe con `stripe_events` (`INSERT ... ON CONFLICT DO NOTHING`): si ya existe se responde 200 `{ received: true, duplicate: true }`. Error del handler → se registra en `stripe_events.error` y se responde 500 para que Stripe reintente.
- **Fuente de verdad**: en `checkout.session.completed` y `customer.subscription.*` se consulta la suscripción viva (`retrieveSubscription`) y el plan sale de `PRICE_TO_PLAN[price.id]`; `maxUsuarios` de `PLAN_LIMITS`. `invoice.*` localiza el tenant por `stripe_subscription_id` leyendo `invoice.subscription` o `invoice.parent.subscription_details.subscription` (API 2025+).
- **Puertos**: `PaymentProvider { ensureCustomer, createCheckoutSession, createPortalSession, retrieveSubscription }` y `WebhookVerifier { construct }`; `StripePaymentProvider` y `FakePaymentProvider` (suscripciones en memoria). En pruebas la firma se genera con `stripe.webhooks.generateTestHeaderString` y se verifica con el verificador real (sin red).
- **URLs**: `success_url = tenantUrl(slug)/billing/success?session_id={CHECKOUT_SESSION_ID}`, `cancel_url = tenantUrl(slug)/planes`, portal `return_url = tenantUrl(slug)/`.

## Risks / Trade-offs

- Zitadel puede tardar en reflejar la organización recién creada para el login inmediato: el frontend redirige al subdominio y el usuario inicia sesión; el token trae la org.
- Los eventos de Stripe pueden llegar desordenados: se re-consulta la suscripción, así que el último estado real gana.

## Migration Plan

Sin migración de esquema. Configurar el endpoint del webhook en Stripe (`https://api.<APP_DOMAIN>/api/billing/webhook`) y `STRIPE_WEBHOOK_SECRET`.

## Open Questions

Ninguna.
