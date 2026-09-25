# Análisis de usabilidad del POS en teléfono

Medido el 25 de septiembre de 2026 sobre el entorno local, a 375×812 px, recorriendo las 20
pantallas y el ciclo completo de una orden.

No es una lista de opiniones: cada punto trae el número que lo sostiene, porque en una interfaz
todo el mundo tiene opinión y casi nadie tiene medida.

## Lo que ya está bien

Conviene decirlo antes, porque enmarca el resto: **el problema no es el tamaño**. Eso ya se
arregló. Ningún control queda por debajo de 44 px, ningún texto por debajo de 14, no hay
desborde horizontal de página, y hay 22 pruebas de navegador que lo vigilan solas.

El ciclo de una orden —tomar, surtir, despachar, cobrar— funciona de principio a fin y está
cubierto por una prueba. Las acciones irreversibles piden confirmación diciendo el importe.

Lo que queda no son defectos de acabado. Son decisiones de estructura heredadas de una interfaz
pensada para pantalla ancha.

---

## 1. Las acciones viven fuera de la pantalla

**El más grave, y con diferencia.**

En las tres pantallas con tabla, la columna que se sale por el borde derecho es **«Acciones»**.

| Pantalla | Columnas | Visibles en 375 px |
|---|---|---|
| Recibir Productos | Producto · Stock · Costo · Estado · **Acciones** | **2 de 5** |
| Reportes (resumen diario) | Fecha · Ventas · Caja · Órdenes · **Acciones** | 3 de 5 |
| Catálogos | Nombre · Estado · **Acciones** | 2 de 3 |

Abres el inventario para ajustar algo y lo único que no ves son los botones para ajustarlo.

Y **no hay ninguna señal** de que haya más a la derecha: la tabla se corta limpia contra el
borde, sin sombra, sin flecha, sin media columna asomando. Quien no sepa que puede arrastrar de
lado, no lo descubre; simplemente concluye que la función no existe.

**Por qué pasa:** una tabla existe para *comparar* filas alineando columnas. En un teléfono no
cabe la comparación, así que se paga el coste —rigidez, scroll lateral— sin recibir el
beneficio.

## 2. Los avisos aparecen donde nadie está mirando

Hay **173 llamadas a `setError` y 74 a `setSuccess`**, y ningún sistema de avisos flotantes.
Los mensajes se dibujan como un bloque dentro del formulario.

El problema es dónde:

| Pantalla | El aviso se dibuja en la línea | El botón que lo provoca, en |
|---|---|---|
| Catálogos | 891 | 1107 |
| Nueva Orden | 904 | 1136 |

El aviso va **antes** que el botón. En un formulario largo en un teléfono, pulsas abajo y el
motivo del fallo aparece arriba, fuera de la pantalla. Desde donde estás, la app no hizo nada.

Esto ya causó un fallo real: al crear una orden, si añadir el platillo fallaba, la app mostraba
el error y se detenía dejando una orden vacía de $0.00. El mensaje existía. Nadie lo veía.

## 3. El color no significa nada

Ocho colores distintos de fondo en botones:

| | | | |
|---|---|---|---|
| naranja 89 | gris 84 | verde 67 | azul 39 |
| rojo 26 | morado 17 | amarillo 16 | índigo 2 |

En una pantalla de servicio el color debería ser un atajo: verde avanza, rojo destruye, naranja
es la acción principal. Con ocho colores repartidos sin regla, el color deja de informar y pasa
a ser decoración — y el operador tiene que leer cada botón, que es justo lo que el color
debería ahorrarle.

## 4. Se abrevian las palabras en vez de hacer sitio

Diez etiquetas se acortan solo en teléfono: **«Prep.», «Cobr.», «Surt.», «Ver.», «Exp.»,
«Sig», «Ant», «Disp»**.

Abreviar el verbo de una acción es caro: «Cobr.» ahorra tres caracteres y cuesta un instante de
duda, justo en el momento de más prisa. Y es un síntoma, no una causa — se abrevia porque el
botón se diseñó estrecho, no porque falte ancho: la pantalla tiene 375 px y la acción principal
de Nueva Orden usaba 56.

## 5. La navegación cuesta un quinto del ancho y está lejos del pulgar

La barra lateral ocupa **70 px de 375 (19 %)** mostrando nueve iconos sin etiqueta.

Dos costes a la vez: el ancho que le quita al contenido —que es de donde sale parte del
problema 1— y la posición. Los objetivos de la zona alta e izquierda son los peores para el
pulgar; los de la zona baja se aciertan entre un **30 y un 50 % más** y se alcanzan entre un
**40 y un 60 % más rápido**.

## 6. No se sabe cuándo el sistema está trabajando

Solo **4 indicadores de carga** en 19 pantallas. En el resto, entre que pulsas y que llegan los
datos no pasa nada visible. Con una conexión de restaurante —wifi saturado a la hora de la
comida— eso se traduce en pulsar dos veces.

Los estados vacíos sí están bien cubiertos (19 mensajes de «no hay…»), que es lo contrario del
problema y conviene reconocerlo.

---

## Qué hacen las apps móviles en su lugar

Ninguna de estas ideas es original; son el repertorio estándar de iOS y Android, y valen aquí
porque resuelven exactamente estos seis puntos.

**Lista de tarjetas en vez de tabla.** Cada registro se lee solo, el texto envuelve, y no hay
columnas que se caigan:

```
┌─────────────────────────────────┐
│ Agua natural 600ml          ⋯   │
│ 24 en stock · $12.00            │
│ ● Suficiente                    │
└─────────────────────────────────┘
```

**Una acción visible, el resto en una hoja.** El `⋯` abre una hoja desde abajo con las opciones
escritas y a tamaño de dedo. Las acciones dejan de competir por ancho, y aparecen en la zona
del pulgar.

**Tocar la tarjeta abre el detalle**, donde caben todos los campos sin apretar nada.

**Avisos flotantes anclados abajo**, encima de la zona donde está la mano, que no dependen de
dónde esté el scroll.

**Navegación inferior** con las cuatro o cinco tareas del servicio; el resto en «Más».

**Tabla a partir de tablet.** Comparar filas vuelve a tener sentido cuando hay ancho, así que la
tabla no se tira: se reserva para donde sirve.

---

## Por dónde empezar

Por daño, no por facilidad:

1. **Avisos flotantes.** Es el cambio más pequeño y el que arregla el fallo más peligroso: que
   la app parezca no responder cuando en realidad está explicando el problema fuera de pantalla.
2. **Recibir Productos a tarjetas.** La peor tabla, 2 de 5 columnas visibles. Sirve además para
   acordar el patrón antes de replicarlo.
3. **Catálogos a tarjetas.** La pantalla de gestión más usada.
4. **Semántica del color.** Reducir de ocho colores a tres con significado, y quitar las
   abreviaturas que dejan de hacer falta al no competir por ancho.
5. **Navegación inferior.** Transversal y el de más riesgo; mejor con lo demás ya asentado.
6. **Reportes.** Ocho tablas, mucho trabajo, y es la pantalla que menos se toca en servicio.

## Cómo sabremos si funcionó

Las pruebas que ya existen cubren tamaños y flujos, pero no dicen nada de esto. Merecen crecer
con tres reglas nuevas:

- **Ninguna acción fuera de la pantalla.** Que ningún control quede a la derecha del borde
  visible. Es la regla que habría cazado la columna «Acciones» sin que nadie mirara.
- **Todo aviso, visible al provocarlo.** Que tras una acción fallida el mensaje esté dentro del
  área visible, no scrolleado arriba.
- **Cada pantalla, sin scroll lateral en ningún contenedor**, no solo en la página.

Y una medida que no es automática pero vale más que todas: **cronometrar a alguien tomando una
orden en un teléfono**, antes y después. Nueve interacciones es el número de hoy; si el
rediseño no lo baja o no lo hace más fluido, no sirvió.
