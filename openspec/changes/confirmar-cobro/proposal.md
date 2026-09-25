# Confirmar antes de cobrar

## Por qué

Al recorrer el flujo completo en teléfono se vio que **pulsar «Cobrar» cierra la venta en el
acto**: la orden pasa a Pagada con un solo toque, sin confirmación.

Es la acción menos reversible del sistema. Revertirla no es un botón: hay que cambiar el estado
a mano y explicarle al cliente por qué su cuenta dice otra cosa.

Resulta incoherente con lo que acabamos de hacer: quitar una línea de una orden —mucho menos
grave, y deshacerlo es volver a añadirla— ahora pide confirmación, y cobrar no.

Subir el botón a 44px bajó el riesgo de toque accidental, pero no lo elimina: en el mismo
recorrido, el control de cobrar queda a pocos píxeles de «PDF» e «Imprimir», y el botón de la
mesa entera cobra varias órdenes de una vez.

## Qué cambia

Cobrar pide confirmación, **diciendo el importe**. El importe es lo que hace útil el aviso: un
«¿seguro?» sin datos se contesta que sí por reflejo, mientras que «¿Cobrar $340.00 de la Mesa
4?» obliga a mirar.

Cobrar la mesa entera pregunta **una vez**, con el total de la mesa, no una vez por orden.

Se distingue de entregar. El mismo control dice «Cobrar» o «Entregar» según el estado, y
entregar no es irreversible: ahí no se pregunta nada.

## Qué no cambia

- El flujo de cobro, los importes y los estados.
- El botón de entregar.
- La disposición de la pantalla.

## Alcance

El requisito existente hablaba de acciones *destructivas*. Se amplía a acciones
*irreversibles*, que es la categoría real: cobrar no destruye nada y aun así no se deshace.
