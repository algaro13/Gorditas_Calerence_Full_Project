# Migrar las pantallas al estándar

## Por qué

El estándar existe pero solo lo usan tres botones. Mientras las 19 pantallas sigan con sus
tamaños a mano, la capa de ergonomía tiene que seguir tapándolos, y esa capa es una red de
seguridad: corrige en el navegador lo que el código dice mal. Cuanto más dure, más fácil es que
alguien lea el código, vea `text-xs`, y lo copie.

Migrar convierte el estándar en lo que el código realmente dice, no en lo que una hoja de
estilos corrige después.

## El método, que es lo que importa

Al proponer el estándar dejé fuera la migración porque una pasada masiva sobre 13.000 líneas no
la puede revisar nadie. Esa objeción era sobre **cómo**, no sobre **si**, y se resuelve con el
método:

- **Pantalla por pantalla**, con su propio commit. Cada uno se revisa solo.
- **Solo sustituciones de alta confianza**: bloques de clases que equivalen exactamente a una
  clase del estándar. Lo dudoso se deja y se anota.
- **Verificada en el navegador** tras cada pantalla, a ancho de teléfono y de escritorio.

El orden va por uso: primero las de servicio, que son las que más se tocan y las que peor
estaban, y al final las que se abren una vez al mes.

## Qué cambia

En cada pantalla, las clases compuestas a mano pasan a las del estándar:

- Botones con altura y relleno propios → `btn`, `btn btn-lg` o `btn btn-min`.
- `<input>` y `<select>` con borde y relleno propios → `campo`.
- Etiquetas de formulario → `etiqueta`.
- Casillas y su texto → `casilla`.
- `text-xs`, `text-sm`, `text-base` y los tamaños arbitrarios → `text-meta`, `text-cuerpo`,
  `text-titulo`, `text-pantalla`.

## Qué no cambia

- El aspecto: los tamaños del estándar son los que la capa ya venía imponiendo en teléfono.
- El comportamiento, los colores y la disposición.
- La capa de ergonomía **se queda** hasta que la última pantalla esté migrada. Quitarla antes
  dejaría sin red a lo que aún no se ha tocado.

## Riesgo

Una sustitución equivocada cambia el aspecto sin que ninguna prueba lo note: no hay pruebas de
interfaz. Por eso cada pantalla se mira en el navegador antes de pasar a la siguiente, y por eso
las sustituciones son conservadoras — ante la duda, se deja como está.
