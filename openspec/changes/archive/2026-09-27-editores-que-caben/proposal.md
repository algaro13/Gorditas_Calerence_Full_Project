# Los editores en línea también tienen que caber

## Por qué

Al editar la nota de un platillo, «Guardar» y «Cancelar» salen montados uno sobre otro: el
primero aparece cortado a la mitad y el segundo encima. Es lo que se ve en la captura del
reporte.

La causa es conocida: una fila `flex` con un campo que pide `flex-1` y dos botones sin nada que
impida encogerlos. En la tarjeta de un platillo, que en un teléfono mide poco más de 250 px, no
caben los tres; los botones se encogen por debajo del ancho de su propio texto y las palabras se
desbordan de su caja.

El mismo patrón está en el recuadro de caja de Reportes, en «Agregar a Caja».

**Lo que hay que explicar no es el fallo, sino por qué pasó desapercibido.** La regla ya está
escrita —«ningún control puede salirse del contenedor en el que se dibuja»— y hay una prueba que
la vigila. Pero esa prueba mira las pantallas tal como se abren, y estos editores no existen
hasta que alguien pulsa «Editar nota». Lo que no se abre, no se mide.

Por eso dos editores llegaron rotos a producción teniendo la regla escrita y una prueba
vigilándola.

## Qué cambia

Los dos editores pasan a dos alturas: el campo en una línea y sus botones debajo. Un editor en
línea dentro de una tarjeta estrecha no tiene sitio para tres cosas en fila.

El campo de la nota usa además el tamaño estándar, que hoy no cumple: mide 26 px de alto en un
sistema cuyo suelo son 44.

La prueba de ergonomía aprende a abrir lo que no se ve al llegar: pulsa los editores en línea y
vuelve a medir con ellos abiertos.

## Lo que hay que cuidar

- **Abrir un editor no puede cambiar datos.** La prueba debe cancelar lo que abra.
- **No todos los roles ni todas las pantallas tienen editores**, así que la prueba solo mide
  donde los encuentra, y lo dice si no encuentra ninguno — si no, pasaría sin medir nada.

## De paso

El botón de la nota dice «Edit. nota». Las abreviaturas se quitaron cuando el color dejó de
competir por ancho; esta sobrevivió porque está dentro de una tarjeta, no en una tabla.
