# Orden de llegada en cocina y en caja

## Por qué

Un cliente reporta que las órdenes no aparecen en el orden en que se toman, ni en «Surtir orden» ni
en «Cobrar»: el primero que llega debe atenderse y cobrarse primero. Revisando el código:

- **Surtir orden** ordena las mesas por su orden más antigua, pero dentro de cada mesa muestra las
  órdenes y los platillos de la más nueva a la más vieja.
- **Cobrar** ordena las mesas por nombre (alfabético: «Mesa 10» antes que «Mesa 2») y, dentro de cada
  mesa, las órdenes de la más nueva a la más vieja.
- **Editar orden**, al agregar un platillo, cambia la hora de la orden a la actual: la manda al final
  de la fila y borra su hora real de los reportes.

## Qué cambia

- **Surtir orden**: mesas por su orden pendiente más antigua; dentro de la mesa, órdenes de la más
  antigua a la más nueva; dentro de la orden, platillos y productos en el orden en que se capturaron.
- **Cobrar**: mesas por su orden lista más antigua (ya no por nombre); dentro de la mesa, órdenes de
  la más antigua a la más nueva.
- **Editar orden**: agregar un platillo ya no toca la hora de la orden; conserva su lugar en la fila
  (decisión del dueño: opción A).
- **Pruebas**: e2e que crean órdenes en distinto orden y revisan el orden en ambas pantallas.

## Fuera de alcance

- El endpoint `PUT /api/ordenes/:id/fecha-hora` se queda en el backend (no lo usa ninguna pantalla).
- El listado de activas ya admite hasta 1000 órdenes; no se cambia.
