# La pantalla de planes decide con la suscripción real, no con el nombre del plan

## Por qué

En el VPS, `taqueria-lupita` tiene «Profesional, activo», pero ese plan lo puso el script de
siembra directo en la base: nunca tuvo suscripción en Stripe. `/planes` le ofrece «Cambiar a este
plan», y al confirmar el backend responde «No hay una suscripción activa que cambiar».

La pantalla adivina si hay suscripción a partir del plan y del estado (`plan !== 'trial'` y
`active` o `past_due`). El backend decide con otra regla —estado vivo **y** una suscripción de
Stripe guardada—, y las dos discrepan en cuanto un restaurante tiene plan sin haber pagado por
Stripe: la siembra, un plan dado a mano por soporte o una migración de datos.

## Qué cambia

- `GET /api/billing/status` añade **`suscripcionViva`**, calculado con la misma función que usan
  `create-checkout` (para responder 409) y `change-plan` (para responder 400). Una sola regla.
- `/planes` decide con ese dato: con suscripción viva ofrece cambiar; sin ella, contratar con
  Checkout, aunque el plan diga «Profesional». Mientras no sabe, no ofrece ninguna de las dos.
- El botón «Gestionar suscripción» (portal de Stripe) tenía el mismo defecto: salía por el
  estado del plan y, sin cliente en Stripe, el portal responde error. Ahora sale solo con
  `tieneClienteStripe`, que el backend ya informa.
- Si aun así el backend responde `YA_SUSCRITO` (una pestaña vieja, por ejemplo), la pantalla lo
  explica en vez de mostrar el error crudo.

## Qué no cambia

Las reglas del backend: quién puede contratar, quién cambiar, y el prorrateo.

## Criterios de aceptación

1. Un restaurante con plan activo y sin suscripción en Stripe ve «Seleccionar» y puede contratar.
2. Uno con suscripción viva ve «Tu plan actual» y «Cambiar a este plan», como antes.
3. En el VPS, `taqueria-lupita` puede contratar desde `/planes`.
4. Suites del backend y de navegador en verde.
