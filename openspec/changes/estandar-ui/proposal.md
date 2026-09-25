# Un estándar de tamaños, en vez de decidir en cada componente

## Por qué

La capa de ergonomía arregló lo que ya estaba escrito, pero **no dice cómo escribir lo
siguiente**. Hoy, para poner un botón hay que elegir a mano entre `py-1`, `py-1.5`, `py-2`,
`py-3` y `h-12 sm:h-14`, y para el texto entre `text-xs`, `text-sm`, `text-base` y ocho tamaños
arbitrarios (`text-[8px]` a `text-[20px]`). Con esa libertad, cada pantalla acabó con su propio
criterio: de 161 botones, 136 quedaron por debajo del mínimo táctil.

La capa los corrige en el navegador, pero es una red de seguridad, no una guía. Mientras no
haya un conjunto cerrado de tamaños, el siguiente componente volverá a inventarse el suyo y la
red tendrá que atraparlo otra vez.

Un estándar también evita fallos que no son de tamaño. En los botones de «Agregar Platillo» la
etiqueta se lee **«AgregarPlatillo»**: el botón es contenedor flex y la separación se confiaba a
un espacio al final de un `<span>`, que el flex colapsa. Es un bug previo, y es exactamente lo
que pasa cuando cada botón se arma a mano.

## Qué cambia

Un conjunto **cerrado y pequeño** de tamaños, expresado como clases de componente, no como
recomendaciones:

- **Espaciado**: 8, 12, 16, 24, 32, 48. Se acaban los huecos de 2 y 4 píxeles entre cosas que se
  tocan, que fueron el origen de los diez objetivos solapados que se midieron.
- **Botones**: tres alturas — 44 (mínimo absoluto), 48 (normal) y 56 (acción principal del
  servicio). Ninguna por debajo de 44, que es el suelo de Apple HIG y WCAG 2.5.5.
- **Campos**: una sola altura, 48, y 16px de letra siempre. Un campo por debajo de 16px hace que
  iOS acerque la pantalla al enfocarlo.
- **Letras**: cuatro tamaños con nombre según su función, no según su tamaño. Ninguno por debajo
  de 14px, y el cuerpo en 16.

Las clases llevan el tamaño dentro, así que usarlas es más corto que componerlas a mano. Esa es
la única forma de que se adopten: un estándar que cuesta más que ignorarlo se ignora.

## Qué no cambia

- La capa de ergonomía se queda. Sigue cubriendo las 19 pantallas ya escritas, que no se
  reescriben en este cambio.
- El aspecto visual: los tamaños del estándar son los que la capa ya impone.
- Tablet y escritorio.

## Qué queda fuera

Migrar las pantallas existentes a las clases nuevas. Son ~13.000 líneas y el beneficio es
ordenar, no arreglar: la capa ya las corrige. Conviene hacerlo al tocar cada pantalla por otro
motivo, no en una pasada masiva que nadie puede revisar.
