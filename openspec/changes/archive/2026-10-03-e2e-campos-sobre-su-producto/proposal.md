# La prueba de campos numéricos actúa sobre su propio producto

## Por qué

`recibir producto: la existencia se vacía…` falló una vez con «esperaba 5, recibió 3» y luego pasó
3 de 3. La prueba crea un producto, escribe su nombre en el buscador y, en cuanto ve el nombre,
pulsa **el primer «Editar» visible de la pantalla**. Si la lista todavía no se ha filtrado, ese
botón es el de otro producto —uno con 3 piezas— y la prueba mide el producto equivocado.

Es peor en la limpieza: al final pulsa **el primer «Eliminar» visible** y acepta el diálogo. En la
misma carrera borraría un producto que no creó, de la base local de quien corre las pruebas.

## Qué cambia

La prueba localiza la tarjeta (o la fila, en escritorio) que contiene el nombre exacto de su
producto y hace todo dentro de ella: editar, leer la cantidad, guardar, comprobar y eliminar. Ya no
depende de que el buscador haya terminado de filtrar.

## Qué no cambia

Lo que la prueba afirma, ni la pantalla.

## Criterios de aceptación

1. Ningún «Editar», «Guardar» ni «Eliminar» de la prueba se pulsa fuera de la tarjeta de su producto.
2. `campos-numericos.spec.ts` pasa 10 veces seguidas.
3. La suite completa de navegador pasa.
