# El tipo de orden sale del catálogo del restaurante, no de un número fijo

## Por qué

**Tomar una orden falla en cualquier restaurante cuyo primer tipo de orden no tenga el id 1.**

`NuevaOrden.tsx` manda `idTipoOrden: 1` escrito a mano. El backend lo busca en el catálogo del
restaurante y, si no lo encuentra, responde `400 TIPO_ORDEN_INVALIDO`. Los ids de catálogo se
generan por restaurante, así que el 1 solo existe para el primero que se dio de alta.

Comprobado en el entorno local: el restaurante `demo` tiene «En mesa», «Para llevar» y
«Domicilio» con ids **2, 3 y 4**, y la pantalla no crea ninguna orden.

El fallo estaba oculto porque el restaurante más antiguo sí tiene el id 1 y ahí funciona. Todo
el que se registró después lo tiene roto, y el síntoma —un error genérico al pulsar «Crear
Orden»— no apunta a la causa.

La raíz no es el número equivocado sino que **el cliente tenga que conocer ids de catálogo para
algo que no le pregunta al usuario**. La pantalla no ofrece elegir tipo de orden: lo deduce del
flujo. Mientras el cliente tenga que adivinar un id, el error puede volver con otro valor.

## Qué cambia

`idTipoOrden` pasa a ser **opcional** al crear una orden. Cuando no viene, el backend usa el
tipo por omisión del restaurante —el primero activo de su propio catálogo— en vez de rechazar
la petición.

El frontend deja de mandar el número fijo. No necesita cargar el catálogo ni resolverlo por
nombre: resolverlo por nombre sería igual de frágil, porque un restaurante puede renombrar sus
tipos.

Cuando el tipo sí venga, se sigue validando exactamente como hoy: un id que no pertenece al
restaurante se rechaza. Eso es aislamiento entre restaurantes y no se toca.

## Qué no cambia

- La validación de un `idTipoOrden` explícito.
- El resto del árbol de la orden, los precios y los estados.
- La pantalla de tomar órdenes, más allá de dejar de mandar el número.

## Riesgo

Un restaurante sin ningún tipo de orden activo seguiría sin poder crear órdenes. Es correcto
—sin catálogo no hay tipo que asignar— pero el error debe decir eso y no «tipo no válido», que
fue justo lo que despistó aquí.
