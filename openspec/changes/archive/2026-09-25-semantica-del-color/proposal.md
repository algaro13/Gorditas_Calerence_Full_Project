# Que el color signifique algo

## Por qué

Hay ocho colores de fondo en los botones, y al mirar qué acción lleva cada uno aparece algo peor
que el desorden: **avanzar una orden se pinta de cuatro colores distintos**.

| Acción | Color hoy |
|---|---|
| Preparar | amarillo |
| Surtir, Listo | morado |
| Surtir Todas | azul |
| Marcar Surtida, Completar Despacho, Cobrar | verde |

Es el mismo acto —mover la orden al siguiente estado— con cuatro señales. En una cocina, con
prisa, eso no es que el color no ayude: es que **estorba**, porque enseña una regla que luego
incumple.

Pasa también con acciones hermanas: «Agregar Platillo» es naranja, «Agregar Producto» verde y
«Agregar Cliente» azul. Ahí el color se usa para **distinguir** botones vecinos, no para
informar — y para distinguirlos ya están su icono y su nombre.

## Qué cambia

Cuatro significados, y ninguno más:

| Clase | Color | Significa |
|---|---|---|
| `btn-primario` | naranja | La acción principal de la pantalla. Una sola |
| `btn-avanzar` | verde | Mover la orden al siguiente estado |
| `btn-destructivo` | rojo | Borrar, cancelar, reiniciar |
| `btn-neutro` | gris | Todo lo demás: imprimir, exportar, volver |

Morado, amarillo, azul e índigo desaparecen de los botones.

El rojo ya era coherente (Eliminar, Reiniciar) y el gris también (Imprimir, menú); esos dos se
conservan tal cual. Lo que se arregla es el verde disperso en cuatro tonos.

## Por qué cuatro y no más

Un sistema de color solo sirve si se puede recordar de un vistazo. Con cuatro, un mesero nuevo
aprende «verde avanza, rojo borra» en un turno. Con ocho no hay nada que aprender, y entonces
hay que leer cada botón — que es justo lo que el color debía ahorrar.

## Qué queda fuera

Las abreviaturas —«Cobr.», «Prep.», «Surt.»— se quitan en el mismo cambio porque dejan de hacer
falta: se abreviaban para que el botón cupiera, y los botones ya no compiten por ancho.

## Qué no cambia

- Qué hace cada botón.
- Los colores de las pastillas de estado (verde «Activo», rojo «Inactivo»), que informan de un
  estado y no de una acción.
