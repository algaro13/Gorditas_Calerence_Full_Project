# Pruebas de navegador que sustituyan el repaso a mano

## Por qué

Cada cambio de interfaz de esta sesión terminó igual: yo recorriendo pantallas a mano y midiendo
con un script improvisado. Funcionó —encontró controles de 13×20 px, etiquetas pegadas, un
botón que borraba sin avisar—, pero **no queda nada**. El siguiente cambio empieza de cero, y
si nadie repite el repaso, la deriva vuelve.

El backend tiene 134 pruebas y el frontend ninguna. Por eso los fallos de interfaz llegaron a
producción y los de lógica no: no es que la interfaz falle más, es que nada la mira.

Lo que hace falta no es cubrir cada botón. Es que **las tres cosas que ya se rompieron** —los
tamaños, que las pantallas carguen, y que el flujo de una orden llegue de principio a fin— dejen
de depender de que alguien se acuerde de mirarlas.

## Qué cambia

Se añade Playwright al frontend, con tres suites:

- **Humo**: cada ruta carga, muestra contenido y no produce errores de consola. Es la que habría
  cazado una migración que deja una pantalla en blanco.
- **Ergonomía**: ningún control por debajo de 44 px, ningún texto por debajo de 14, sin desborde
  horizontal. Convierte el estándar en una regla que se ejecuta, no en un documento que se lee.
- **Flujo**: tomar una orden, surtirla, despacharla y cobrarla. Es el camino que da de comer al
  restaurante; si ese se rompe, da igual lo demás.

Corren a ancho de teléfono, que es donde estaban los problemas.

## La sesión

Las pruebas necesitan sesión, y montarla en cada prueba sería lento y frágil. Se inicia **una
vez** y se guarda el estado; las demás parten de ahí.

La credencial es la del restaurante de pruebas local, la que ya está versionada en
`docs/local-testing.md` para el entorno de desarrollo. Se lee de una variable de entorno con ese
valor por omisión, para que quien quiera usar otro restaurante no tenga que tocar el código.

## Qué no cambia

- El código de la aplicación.
- Las pruebas del backend.

## Qué queda fuera

Cubrir cada acción de cada pantalla —editar un platillo, exportar un reporte, guardar
configuración—. Es deseable, pero el valor está concentrado en lo de arriba: una suite enorme
que nadie mantiene acaba desactivada, y entonces protege menos que tres pruebas que sí corren.
