# Promociones y combos

## Por qué

El restaurante quiere vender «2 gorditas + refresco a $60» y «los martes, 3x2 en gorditas». Hoy
no hay ninguna forma de decirle eso al sistema.

Lo único que se puede hacer sin tocar nada es dar de alta el combo como un platillo más, con su
precio. Funciona en la caja y se paga en la cocina: el cocinero ve una línea que dice «Combo» y
no dos gorditas y un refresco, el refresco **no se descuenta del inventario** porque no es una
línea de producto, y en «Productos vendidos» desaparecen los refrescos que se fueron en combo.

## Lo que ya juega a favor

Tres decisiones que ya están tomadas en el código y que este cambio solo extiende:

- **El precio lo fija el catálogo, no el cliente.** `precioAutoritativo` ignora el importe que
  manda el navegador salvo que el catálogo no tenga precio. Un descuento tiene que seguir la
  misma regla: lo calcula el servidor o no vale nada.
- **El total se calcula en un solo sitio.** `recalcularTotal` recompone el total en SQL sumando
  los importes de productos, platillos y extras. No hay otro camino, así que no hay forma de
  saltárselo.
- **El inventario ya se descuenta al vender** un producto. Eso es lo que decide la forma del
  combo.

## Qué cambia

Un combo **se despliega en sus líneas reales** —sus dos gorditas y su refresco, a precio de
carta— y la diferencia se anota en una línea aparte, con importe negativo:

| Línea | Importe |
|---|---|
| 3 × Gordita de chicharrón | $75.00 |
| 1 × Refresco 600 ml | $15.00 |
| Promoción: martes 3x2 en gorditas | −$25.00 |
| Combo comida | −$5.00 |
| **Total** | **$60.00** |

Las dos primeras líneas son exactamente las de hoy. Las dos siguientes son filas de una tabla
nueva. `recalcularTotal` pasa de sumar tres cosas a sumar cuatro.

Así todo lo que hay debajo sigue funcionando sin enterarse: la cocina ve qué preparar, el stock
se descuenta, los reportes por producto cuadran, y cada descuento queda con su nombre, su
importe y quién lo autorizó.

La alternativa —una columna `descuento` en la orden— se descarta: es más simple y pierde el
porqué. No distingue un combo de un descuento a mano y no permite reportar por promoción.

## Las decisiones que hay que fijar por escrito

**Un descuento de promoción es derivado, no escrito.** Si se aplicara al añadir la línea, quitar
una gordita dejaría el 3x2 mal calculado. Cada vez que cambia la orden, el servidor vuelve a
decidir qué promociones aplican y reescribe sus líneas de descuento. El descuento **manual** es
lo contrario —un dato que alguien escribió— así que se distingue por su origen y sobrevive al
recálculo.

**Dos promociones aplicables no se acumulan.** Gana la que más favorece al cliente, salvo que
una esté marcada como acumulable. Sin esta regla, el mismo ticket da importes distintos según el
orden en que se evalúen.

**Descontar a mano es sacar dinero del cajón.** Exige rol de Admin o Encargado, motivo escrito,
y aparece en el reporte del día. Es el único control que de verdad importa aquí.

**El horario de una promoción es el del negocio.** Una «hora feliz de 4 a 6» evaluada en UTC
empieza a las diez de la mañana — es el mismo fallo que el día del reporte calculado en UTC, ya
corregido. La ventana se evalúa con la zona del negocio, en el servidor.

**Las formas de promoción son un conjunto cerrado**: combo, NxM y porcentaje sobre una
categoría. Cerrado a propósito, como el estándar de tamaños. Un motor de reglas genérico es
donde se atascan estos proyectos, y ningún restaurante ha pedido todavía la regla que lo
justificaría.

## Lo que hay que tapar antes

`AgregarLineas` **no mira el estatus de la orden**: hoy se puede añadir una línea a una orden ya
pagada, y `recalcularTotal` le cambia el total. Hoy es un descuido; con descuentos derivados se
vuelve grave, porque un recálculo alteraría en silencio lo que ya se cobró.

Una orden pagada queda congelada, y la línea de descuento guarda copia del nombre de la
promoción, igual que las líneas ya guardan `nombrePlatillo` y `costoPlatillo`: lo que se vendió
se cuenta como era el día que se vendió.

## Lo que cambia de significado

Hoy el reporte suma `o.total` y lo llama «Ventas». Con descuentos ese total pasa a ser **neto**,
y el número cambia de significado sin avisar a nadie. El reporte necesita las tres cifras
—bruto, descuento y neto— o el restaurante no puede ver cuánto regaló.

## En qué orden

Cada fase se sostiene sola y se puede desplegar sola:

1. **Congelar la orden pagada.** Arregla algo que ya está mal y es requisito de todo lo demás.
2. **La línea de descuento y el descuento manual**, con rol, motivo y su cifra en el reporte.
   Con solo esto ya hay combos —a mano— y un control de caja que hoy no existe.
3. **El catálogo de promociones** con las tres formas cerradas, evaluadas en el servidor.
4. **Las ventanas de día y hora**, encima de las tres formas.

## Qué no cambia

- Los precios del catálogo y la forma en que se copian a la línea.
- El inventario, la cocina y el ciclo de la orden.
- La utilidad del reporte, que sigue siendo (ventas + caja) − gastos, ahora con ventas netas.
