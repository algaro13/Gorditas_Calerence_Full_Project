# Que los avisos se vean donde está la mano

## Por qué

Hay 173 llamadas a `setError` y 74 a `setSuccess`, y ninguna de ellas garantiza que alguien lea
el mensaje: se dibujan como un bloque dentro del formulario, **antes** que el botón que los
provoca. En Catálogos el aviso está en la línea 891 y el botón en la 1107; en Nueva Orden, 904
frente a 1136.

En un formulario largo en un teléfono eso significa que pulsas abajo, el mensaje aparece arriba
—fuera de la pantalla— y desde donde estás la aplicación simplemente no hizo nada.

No es hipotético. Al crear una orden, si añadir el platillo fallaba, la app mostraba el error y
se detenía dejando una orden vacía de $0.00. El mensaje existía. Nadie lo veía, y el fallo se
manifestaba tres pantallas después.

## Qué cambia

Un componente de aviso que se ancla **abajo**, flotando sobre el contenido, independiente de
dónde esté el scroll. Abajo y no arriba porque es donde está el pulgar y donde mira el ojo
después de pulsar.

Se sustituyen los **23 sitios donde se dibuja** el aviso. Las 247 llamadas que lo *provocan* no
se tocan: cada pantalla sigue con su `setError` y su `setSuccess` como hasta ahora. Cambiar
dónde aparece el mensaje no debería obligar a reescribir quién lo escribe.

El aviso se va solo —antes el de éxito, más tarde el de error— y se puede descartar tocándolo.
Un error que se queda para siempre estorba tanto como uno que no se ve.

## Qué no cambia

- Los mensajes, su texto y cuándo se emiten.
- El estado local de cada pantalla.

## Riesgo

Un aviso anclado abajo puede tapar un control. Se reserva su espacio y se coloca por encima de
la zona de contenido, no sobre los botones de acción.
