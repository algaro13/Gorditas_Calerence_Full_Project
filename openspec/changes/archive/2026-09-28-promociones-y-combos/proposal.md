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
| **Total** | **$70.00** |

Las dos primeras líneas son exactamente las de hoy. Las dos siguientes son filas de una tabla
nueva. `recalcularTotal` pasa de sumar tres cosas a sumar cuatro.

Así todo lo que hay debajo sigue funcionando sin enterarse: la cocina ve qué preparar, el stock
se descuenta, los reportes por producto cuadran, y cada descuento queda con el nombre de la
regla que lo concedió y su importe.

La alternativa —una columna `descuento` en la orden— se descarta: es más simple y pierde el
porqué. No distingue un combo de una promoción y no permite reportar por cuál se aplicó.

## Las decisiones que hay que fijar por escrito

**Todo descuento sale de una regla; no hay descuentos a mano.** El dinero sale del cajón de una
sola forma: una regla que el restaurante escribió antes. Un importe que alguien teclea en el
mostrador no se distingue de un faltante al cuadrar el día, y custodiarlo —rol, motivo escrito,
nombre de quien lo autorizó y su propia cifra en el reporte— cuesta más que la cortesía que
compra. Si mañana se quiere hacer una, se hace como promoción: se define una vez y se aplica por
el mismo camino que las demás.

**Los descuentos son derivados.** Si se aplicaran al añadir la línea, quitar una gordita dejaría
el 3x2 mal calculado. Cada vez que cambia la orden, el servidor vuelve a decidir qué promociones
aplican y reescribe sus líneas de descuento. Esto solo es posible porque ninguno se escribe a
mano: todos se pueden volver a calcular desde lo que la orden tiene.

**Dos promociones aplicables no se acumulan.** Gana la que más favorece al cliente, salvo que
una esté marcada como acumulable. Sin esta regla, el mismo ticket da importes distintos según el
orden en que se evalúen.

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
—bruto, descuento y neto— o el restaurante no puede ver cuánto regaló. Y desglosado por
promoción, para distinguir la que trae gente de la que solo regala lo que se habría vendido
igual.

## El ticket

Es donde el descuento se vuelve comprobable. Un ticket que solo imprime el total ya descontado no
lo puede revisar el cliente ni auditar el dueño: no hay forma de distinguir una promoción que se
aplicó de un precio mal cobrado.

Así que imprime los artículos a precio de carta, un subtotal, cada descuento con el nombre de lo
que lo concedió, el total y lo que se ahorró. De paso se arreglan dos cosas del ticket de hoy:
dice `RESTAURANTE` en duro aunque el sistema conoce el nombre del negocio, e identifica la orden
con los últimos seis caracteres de su UUID en vez del folio que usan los reportes — hoy un ticket
en la mano no se puede cruzar con el corte del día.

## En qué orden

Cada fase se sostiene sola y se puede desplegar sola:

1. **Congelar la orden pagada.** Arregla algo que ya está mal y es requisito de todo lo demás.
2. **La línea de descuento**, con su sitio en el ticket y su cifra en el reporte. Es el andamio
   sobre el que se apoya todo lo demás.
3. **El catálogo de promociones** con las tres formas cerradas, evaluadas en el servidor. Aquí
   aparecen los combos y las promociones de verdad.
4. **Las ventanas de día y hora**, encima de las tres formas.

## Qué no cambia

- Los precios del catálogo y la forma en que se copian a la línea.
- El inventario, la cocina y el ciclo de la orden.
- La utilidad del reporte, que sigue siendo (ventas + caja) − gastos, ahora con ventas netas.
