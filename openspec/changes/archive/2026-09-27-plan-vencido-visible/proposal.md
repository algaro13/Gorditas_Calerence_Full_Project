# Cuando el plan bloquea, decirlo

## Por qué

Un restaurante con la prueba vencida no ve un aviso: ve un sistema roto.

Abre Catálogos → Mesas y la lista sale vacía, aunque tenga ocho mesas. Pulsa «Nuevo Mesa» y el
nombre que se propone es «Mesa 1», porque el autogenerado cuenta las que ve y no ve ninguna.
Guarda, y no pasa nada. Lo mismo en cada pantalla del POS.

El backend, mientras tanto, está contestando con toda claridad:

```
403  TRIAL_EXPIRED
"Tu periodo de prueba ha expirado. Selecciona un plan para continuar."
```

El SPA no mira ese código en ninguna parte —no aparece ni una vez en todo el frontend—. Solo
sabe reaccionar al 401. Así que cada pantalla recibe su 403, se queda con la lista vacía, y
calla.

Pasó de verdad hoy, en producción: `demo` tiene la prueba vencida desde el 21 de septiembre, y
desde el teléfono parecía que las mesas se habían borrado.

Para un sistema que se cobra por suscripción, este es el peor sitio donde callarse: el que
quiere pagar no se entera de que tiene que pagar, y el que ya pagaba cree que el sistema se
rompió.

## Qué cambia

`GET /api/tenants/me` dice si el acceso está bloqueado y por qué. El motivo lo decide el mismo
código que bloquea las rutas, para que no haya dos reglas que puedan separarse.

Con eso, el SPA lleva al restaurante a la pantalla de planes en vez de dejarlo en un POS vacío,
y esa pantalla explica qué pasó.

Y como el plan puede vencer con la sesión abierta, un 403 con motivo de plan en cualquier
llamada tiene el mismo efecto: dejar de fingir que todo va bien.

## Lo que hay que cuidar

- **La pantalla de planes tiene que seguir siendo alcanzable.** Es la salida, así que no puede
  quedar detrás del mismo bloqueo. El backend ya exceptúa las rutas de facturación.
- **Configuración y personal**, que no dependen del plan, hoy tampoco quedan bloqueadas por el
  backend. Llevar al usuario a planes no debe impedirle salir a esas pantallas ni cerrar sesión.
- **No inventar la regla en el frontend.** Si el SPA decidiera por su cuenta cuándo un plan
  bloquea, tarde o temprano diría una cosa distinta de la que hace el backend.

## Qué no cambia

- Cuándo se bloquea, que ya estaba decidido y probado en el backend.
- El resto de las pantallas.

## De paso

En el diálogo de crear mesa, el botón «Crear Nuevo pedido» se sale de la caja: está en una fila
`flex` junto a un campo con `w-full`, que reclama el ancho entero y lo empuja fuera. Se ve en la
captura que abrió este reporte.
