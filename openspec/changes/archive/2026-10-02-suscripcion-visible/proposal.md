# La suscripción, a la vista del administrador

## Por qué

El administrador no tiene dónde ver ni gestionar su suscripción. El menú no la menciona y
Configuración solo trae la imagen y la paleta. La única puerta es el aviso del Panel Principal,
que lleva a `/planes`: una página de venta, fuera del layout, que dice «Plan actual: trial
(trial)» con los valores internos sin traducir.

Lo grave es lo que no se ve. Cuando falla un cobro, la suscripción pasa a `past_due` y el
restaurante sigue operando, pero el aviso del panel no tiene nada que decir para ese estado y
devuelve vacío. El administrador se entera cuando Stripe agota los reintentos, cancela, y el
punto de venta se pone en pausa a media jornada.

Tampoco se sabe cuándo se renueva ni cuándo termina una suscripción que se canceló desde el
portal: el webhook solo guarda el estado, no las fechas.

## Qué cambia

- **Una entrada «Suscripción» en el menú**, solo para Admin, que abre `/suscripcion` dentro del
  layout. Admin porque es quien puede pagar: el backend ya limita a Admin el checkout y el
  portal, y un Encargado que viera la pantalla no podría hacer nada en ella.
- **La pantalla `/suscripcion`** dice en español el plan y su estado, los días de prueba que
  quedan o la fecha de renovación, la fecha en que termina si se canceló, y cuántos usuarios
  activos hay frente al límite del plan. Ofrece «Cambiar de plan» (va a `/planes`) y, cuando
  existe cliente en Stripe, «Administrar pago y facturas» (el portal de Stripe), que vuelve a
  `/suscripcion` y no al panel.
- **El webhook guarda las fechas** de la suscripción: fin del periodo actual (`current_period_end`
  del primer artículo, donde lo pone la API actual de Stripe) y la fecha de cancelación
  programada (`cancel_at`, o el fin del periodo si solo viene `cancel_at_period_end`).
- **`GET /api/billing/status`** añade esas fechas, los usuarios activos y si hay cliente en
  Stripe. Sigue sin pasar por el guard de plan, para que un restaurante en pausa pueda leerlo.
- **El aviso del panel** cubre `past_due` en rojo, con el llamado a actualizar el método de pago,
  y una suscripción activa con cancelación programada.
- **`/planes`** muestra el plan y su estado traducidos.

## Qué no cambia

- Cambiar de tarjeta, cancelar y descargar facturas se sigue haciendo en el portal de Stripe. No
  se reconstruye eso dentro de la app.
- Las reglas de bloqueo (`accessBlockReason`) y el guard de plan.
- Un restaurante en pausa sigue yendo a `/planes`, que ya explica qué pasó.

## Criterios de aceptación

1. Un Admin ve «Suscripción» en el menú lateral y en «Más»; Encargado, Mesero, Despachador y
   Cocinero no la ven, y si escriben `/suscripcion` son redirigidos.
2. `/suscripcion` muestra plan, estado en español, días de prueba o fecha de renovación, y
   usuarios activos frente al límite, con datos reales del backend.
3. «Administrar pago y facturas» aparece solo si hay cliente en Stripe y abre el portal.
4. Un webhook de suscripción guarda fin de periodo y cancelación programada, y `status` los
   devuelve.
5. Con `past_due` el panel muestra un aviso rojo que lleva a `/suscripcion`.
6. `/planes` ya no dice «trial (trial)».
7. Pasan las suites del backend y el humo y la ergonomía del navegador.
