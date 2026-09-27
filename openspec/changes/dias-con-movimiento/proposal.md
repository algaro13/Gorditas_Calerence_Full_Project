# Un día con movimiento es un día del resumen

## Por qué

El resumen por día se arma recorriendo **solo los días que tuvieron ventas**:

```ts
for (const venta of ventasPorDia) { ... }
```

Un día sin ventas no existe para el reporte. Y como los cuatro totales de arriba se calculan
sobre esa misma lista, lo que pasara ese día tampoco se suma en ninguna parte:

| Qué ocurrió ese día | Dónde aparece hoy |
|---|---|
| Se anotó dinero en caja | En ningún sitio |
| Se registró un gasto | En ningún sitio |

Lo del gasto es lo grave, porque no solo falta un renglón: **la utilidad sale inflada**. Se
gastaron $2 000 en un día que no abrió y el reporte los ignora, así que dice que se ganó más de
lo que se ganó.

Hay además un detalle que lo hace más fácil de pasar por alto: los gastos del período ni
siquiera se piden si no hubo ventas. La llamada está dentro de `if (ventasPorDia.length > 0)`,
así que un mes entero sin ventas y con gastos se ve completamente vacío.

Salió al probar la caja: se anota un monto en un día sin ventas, el servidor lo guarda, y la
pantalla no lo muestra en ningún sitio. El dinero está, pero invisible.

## Qué cambia

El resumen pasa a listar los días **con movimiento**: ventas, caja o gastos. Cada tarjeta muestra
lo que ese día tenga, y los ceros se ven como ceros en vez de desaparecer.

Los gastos del período se piden siempre, haya ventas o no.

Los totales de arriba, que se calculan sobre esa lista, empiezan a cuadrar solos: no hay que
tocarlos.

## Lo que hay que cuidar

- **La caja del período.** Hoy se carga entera al montar la pantalla, y el resumen se arma antes
  de que llegue. Para que un día de solo caja aparezca desde el primer pintado, el resumen tiene
  que pedir la caja del período que está mostrando.
- **Los días de solo caja o solo gastos no tienen órdenes.** La tarjeta sigue ofreciendo «Ver
  órdenes», que abriría una lista vacía. Mejor no ofrecer lo que no hay.
- **La utilidad de arriba** ya suma caja y resta gastos. Con más días en la lista sigue saliendo
  de lo mismo, pero ahora con todos los sumandos.

## Qué no cambia

- El backend. Los días con ventas los sigue agrupando él; el de gastos ya devuelve su propio
  desglose por día, y el de caja también.
- El significado de la utilidad.

## De paso

`obtenerFechaDelDia`, que decide qué órdenes pertenecen al día que se abre, lleva la zona
`America/Mexico_City` escrita a mano, y tres comentarios que dicen que replica un
`$dateToString` de MongoDB «sin timezone = UTC» — que es justo lo contrario de lo que hace el
código. Pasa a usar la zona del negocio, como el resto de la pantalla, y los comentarios se van.
