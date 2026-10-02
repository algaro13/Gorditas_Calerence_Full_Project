# Lo que salió de recorrer la suscripción en el navegador

## Por qué

Se recorrieron en el navegador todos los estados de la suscripción —prueba con días de sobra,
prueba que termina hoy, prueba vencida, activa, pago pendiente (llegado por webhook y recuperado),
cancelación programada, cancelación definitiva por webhook, Empresarial sin límite— con un Admin y
con un Mesero de verdad. Funcionó lo principal; fallaron seis cosas.

## Lo que falló

1. **Una prueba que termina hoy decía «termina el 2 de octubre (queda 1 día)».** La cuenta
   redondea hacia arriba, así que unas horas son «1 día», y la fecha es la de hoy: las dos mitades
   de la frase se contradicen.
2. **El aviso del panel decía «1 día restantes».** El sustantivo se ponía en singular y el
   adjetivo no.
3. **Con la prueba vencida, `/planes` decía «Plan actual: Prueba gratuita · En prueba»**, justo
   debajo de «Tu periodo de prueba terminó». El estado guardado sigue siendo `trial`; vencida es
   algo que se deduce de la fecha.
4. **Con el acceso en pausa nadie podía salir**, y el Mesero quedaba atrapado: `/planes` no tiene
   menú ni botón de cerrar sesión, sus tres botones están deshabilitados porque no es Admin, y el
   texto le pedía «Elige un plan abajo». El spec ya exigía que cerrar sesión siguiera al alcance.
5. **Pago pendiente y cancelación programada a la vez** —ocurre si alguien cancela desde el portal
   con un cobro rechazado— mostraba la pastilla «Cancelación programada» en rojo. Lo urgente es el
   pago: mientras no se cobre, el restaurante puede pausarse antes de la fecha de cancelación.
6. **En prueba y con el cupo lleno, la pantalla decía «cambia a un plan mayor».** En prueba no hay
   plan del cual subir; lo que toca es elegir uno.

## Qué cambia

- La fecha de fin de prueba se dice como «hoy», «mañana» o «el 25 de octubre (quedan 23 días)».
- «1 día restante» en singular.
- `/planes` y `/suscripcion` muestran «Prueba vencida» cuando la prueba ya terminó.
- `/planes` con el acceso en pausa ofrece «Cerrar sesión» a cualquiera, y a quien no es Admin le
  dice que avise al administrador en vez de pedirle que elija un plan.
- Con pago pendiente la pastilla dice «Pago pendiente», haya o no cancelación programada; la fecha
  de cancelación se sigue diciendo debajo.
- En prueba con el cupo lleno: «elige un plan con más usuarios».

## Lo que se probó y funcionó

Menú del Admin (barra lateral y «Más») y su ausencia para el Mesero; `/suscripcion` redirige al
Mesero; aviso del panel en cada estado y su enlace; `invoice.payment_failed` → pago pendiente al
instante (el webhook invalida la caché del restaurante) e `invoice.paid` → activo;
`customer.subscription.deleted` → pausa y `/planes`; el portal abre y regresa a `/suscripcion`;
Empresarial sin límite; seleccionar plan sin precios de Stripe muestra el error.

## Criterios de aceptación

1. Cada uno de los seis casos se ve corregido en el navegador.
2. Un Mesero con el acceso en pausa puede cerrar sesión y volver a la pantalla de entrada.
3. Lo que ya funcionaba sigue funcionando: suites del backend y de navegador en verde.
