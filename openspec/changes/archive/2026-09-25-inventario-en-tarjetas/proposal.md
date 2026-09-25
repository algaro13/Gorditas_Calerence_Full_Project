# El inventario en tarjetas, no en tabla

## Por qué

De las cinco columnas de esta pantalla, en un teléfono **solo se ven dos**: «Producto» y medio
«Stock». Costo, Estado y **Acciones** quedan fuera del borde derecho.

Es la peor de las tres tablas del sistema, y el daño no es estético: abres el inventario para
ajustar algo y lo único que no ves son los botones para ajustarlo. Tampoco hay señal de que
haya más a la derecha —la tabla se corta limpia contra el borde—, así que quien no sepa
arrastrar de lado concluye que la función no existe.

Una tabla existe para **comparar** filas alineando columnas. En un teléfono no cabe la
comparación, así que se paga la rigidez sin recibir el beneficio.

## Qué cambia

En teléfono, cada producto pasa a ser una tarjeta que se lee sola: el nombre, el stock y el
costo en una línea, el estado como pastilla, y sus acciones dentro de la propia tarjeta.

En tablet y escritorio **se conserva la tabla**, porque ahí comparar filas sí tiene sentido y
las cinco columnas caben.

La edición en línea sigue funcionando igual en ambas: los mismos `+`/`−` para el stock, el
mismo campo de costo, el mismo selector de estado.

## Cómo, para que no se separen

Cada campo se define **una vez** y lo usan las dos presentaciones. Duplicar el JSX de cinco
campos en dos modos sería duplicar diez trozos que divergen al primer cambio: alguien arregla
el costo en la tabla y no en la tarjeta, y el fallo solo se ve en teléfono.

## Qué no cambia

- La lógica de guardar, borrar y ajustar cantidades.
- Los datos que se muestran.
- La tabla en pantallas anchas.
