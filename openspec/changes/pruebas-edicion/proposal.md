# Probar también que se guardan los cambios

## Por qué

Las pruebas de navegador cubren el camino que crea cosas: tomar una orden, surtirla, cobrarla.
No cubren el que las **modifica**, y es el que más fácil se rompe en silencio: un formulario que
envía pero no persiste deja la pantalla igual de bonita y el dato sin cambiar.

Editar un platillo y guardar la configuración son los dos sitios donde un restaurante cambia lo
suyo: el precio de lo que vende y los datos de su negocio. Si cualquiera de los dos deja de
guardar, nadie se entera hasta que alguien nota que el precio viejo sigue cobrándose.

Ya hubo un aviso de esto en esta sesión: el `getCupo` que no existía pasó el typecheck y solo se
vio al abrir la pantalla. Las peticiones que no llegan no las caza el compilador.

## Qué cambia

Dos pruebas más, en el mismo estilo que las que ya hay: cambian un valor, **recargan**, y
comprueban que el valor nuevo sigue ahí.

La recarga es el punto. Afirmar sobre la pantalla sin recargar prueba que React actualizó su
estado, no que el dato se guardó — que es justo el fallo que se quiere cazar.

Cada prueba deja lo que tocó como estaba, para poder correrlas muchas veces.

## Qué no cambia

- Las pruebas que ya existen.
- El código de la aplicación.
