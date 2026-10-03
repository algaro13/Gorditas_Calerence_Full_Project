# Cambiar de plan sin abrir una segunda suscripción

## Por qué

Se probó la suscripción contra Stripe en modo test: pago con la tarjeta 4242, webhooks reales
reenviados con `stripe listen`, portal real, cancelación programada y su reactivación. Todo eso
funcionó. Fallaron tres cosas:

1. **Cambiar de plan abría una segunda suscripción.** Con Básico activo, «Cambiar de plan» →
   Profesional → «Seleccionar» abre un Checkout nuevo. Si el cliente paga, Stripe le cobra $299 +
   $599 cada mes; la app guarda solo la nueva en `stripe_subscription_id` y la vieja sigue
   cobrando sin aparecer en ningún sitio. El portal tampoco ofrece cambiar de plan: solo cancelar.
2. **El cliente de Stripe se creaba sin correo.** El access token de Zitadel no trae `email`, así
   que `auth.email` llega vacío y el primer Checkout pide teclearlo a mano.
3. **El portal sale en inglés**, mientras el Checkout ya va en español (`es-419`).

## Qué cambia

- `POST /api/billing/create-checkout` responde **409 `YA_SUSCRITO`** cuando el restaurante ya
  tiene una suscripción viva (`active` o `past_due`). Contratar es para quien no tiene una.
- Nuevo **`POST /api/billing/change-plan`** `{ plan }`, solo Admin: cambia el precio de la
  suscripción existente con **prorrateo inmediato** (`proration_behavior: create_prorations`): el
  plan y el cupo cambian en el momento, y la diferencia (a cobrar o a favor) va en la siguiente
  factura. Aplica el resultado al restaurante en el acto, sin esperar el webhook, con la misma
  función que usa el webhook. 400 si no hay suscripción viva o si es el mismo plan.
- **`/planes`** con suscripción viva: la tarjeta del plan actual dice «Tu plan actual» y no se
  pulsa; las otras dicen «Cambiar a este plan» y piden confirmación en la misma tarjeta, explicando
  el prorrateo, antes de llamar a `change-plan`.
- El cliente de Stripe se crea con el correo del miembro guardado en el restaurante cuando el token
  no lo trae.
- El portal se abre en español (`locale: es-419`).

## Qué no cambia

Contratar desde la prueba o tras una cancelación sigue siendo Checkout. Cancelar, reactivar, el
método de pago y las facturas siguen en el portal.

## Criterios de aceptación

1. Con una suscripción viva, `create-checkout` responde 409 y `/planes` no ofrece Checkout.
2. En Stripe modo test, cambiar de Básico a Profesional desde `/planes` deja **una sola**
   suscripción, con el precio de Profesional, y la app muestra Profesional con cupo de 10.
3. Un cliente nuevo de Stripe se crea con el correo del administrador.
4. El portal se abre en español.
5. Suites del backend y de navegador en verde.
