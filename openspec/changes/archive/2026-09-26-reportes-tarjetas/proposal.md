# Reportes, legible en un teléfono

## Por qué

Es la última pantalla del análisis y la que más tabla tiene: **ocho**, medidas hoy a 375 px.

| Tabla | Columnas | Ancho | Se sale por |
|---|---|---|---|
| Órdenes del día | 7 | 577 px | **299 px** |
| Gastos | 6 | 524 px | 246 px |
| Resumen por día | 5 | 485 px | 110 px |
| Inventario | 5 | 459 px | 181 px |
| Productos vendidos | 3 | 298 px | 20 px |

Las tres del detalle de una orden —productos, platillos con sus extras, extras sueltos— viven
además *dentro* de una celda de la tabla de órdenes, así que arrastran su propio desplazamiento
lateral dentro de otro.

La tabla de órdenes se sale **más que el ancho entero de la pantalla**. Y como en las otras
pantallas, la columna que queda fuera es **«Acciones»**: «Ver órdenes» en el resumen por día,
borrar en gastos. Abres el reporte y lo único que no ves es con qué actuar sobre él.

Quedan dos abreviaturas de cuando el ancho era oro: los botones de cabecera dicen **«Act.» y
«Exp.»** en teléfono. La semántica del color ya quitó las demás; estas sobrevivieron porque
están fuera de las tablas.

## Qué cambia

Las cinco listas de registros pasan a **tarjetas en teléfono y tabla a partir de tablet**, que es
el patrón ya acordado en Recibir Productos y Catálogos: cada campo se define una vez y lo usan
las dos presentaciones, para que no diverjan.

Cada tarjeta lleva su identidad arriba —el día, el folio, el producto, el gasto—, sus cifras
etiquetadas debajo, y sus acciones a lo ancho, al alcance del pulgar.

Las tres tablas del detalle de una orden pasan a líneas legibles: concepto, y a la derecha
cantidad e importe. Son listas de dos o tres datos; nunca necesitaron una tabla.

Los botones de cabecera recuperan sus nombres: «Actualizar» y «Exportar».

## Lo que hay que cuidar

- **Los totales.** Varias tablas terminan en una fila de suma. Una tarjeta no tiene pie, así que
  el total necesita su propio sitio y tiene que seguir cuadrando.
- **La edición del monto de caja** vive dentro de una celda del resumen por día, con su campo y
  sus botones de confirmar y cancelar. Tiene que seguir funcionando en las dos presentaciones.
- **El detalle desplegable** hoy es una fila que ocupa todas las columnas. Sin tabla, necesita
  colgar de su tarjeta.
- **Exportar a Excel** lee los mismos datos, no la presentación. No debe cambiar.

## Qué no cambia

- Los cálculos, los filtros por fecha y las cuatro pestañas.
- La tabla en pantalla ancha, donde comparar filas sí sirve.
- El formato del archivo exportado.
