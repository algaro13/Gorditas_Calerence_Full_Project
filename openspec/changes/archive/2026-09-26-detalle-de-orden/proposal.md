# El detalle de una orden, con lo que se vendió dentro

## Por qué

En Reportes, abrir el detalle de cualquier orden muestra «No hay productos.» y «No hay
platillos.» **siempre**, aunque la orden tenga total y sus platillos existan en la base.

La causa es un vínculo que se pierde al aplanar. El backend lee las órdenes con sus subórdenes
y sus platillos anidados, y luego devuelve cuatro listas planas:

```ts
const platillos = ordenes.flatMap((o) => o.subordenes.flatMap((s) => s.platillos));
```

Un platillo guarda `idSuborden`, no `idOrden`. Al aplanar, la suborden —que era quien sabía a
qué orden pertenece— desaparece, y con ella el vínculo.

El frontend intentaba reconstruirlo comparando los **siete primeros caracteres** de dos
identificadores:

```ts
return o._id.slice(0, 7) === pl.idSuborden.slice(0, 7);
```

Eso funcionaba cuando los identificadores eran ObjectId de Mongo y compartían prefijo por
haberse generado con el mismo reloj. Con UUID v4 no acierta jamás, y el resultado es un reporte
que dice que no se vendió nada.

Nadie lo notó porque la tabla escondía el síntoma: salió al pasar la pantalla a tarjetas, donde
«Sin items» queda escrito en cada tarjeta en vez de perderse en una celda.

## Qué cambia

El backend añade `idOrden` a cada platillo de la respuesta. Es el dato que la forma plana
necesita y que la forma anidada ya tenía: si la API decide aplanar, le toca conservar la llave.

El frontend enlaza por ese `idOrden` y deja de adivinar por prefijo, en los dos sitios donde lo
hacía: el detalle y el resumen por cliente de una mesa agrupada.

También desaparece el apartado «Extras adicionales». Prometía mostrar extras que no cuelgan de
ningún platillo, pero en esta API un extra solo llega dentro de su platillo —`extras` se
construye recorriendo los platillos—, así que ese apartado no podía aparecer nunca. Código que
no puede ejecutarse solo sirve para confundir a quien lo lee.

## Lo que hay que cuidar

- **Los productos ya funcionaban**: guardan `idOrden` y se enlazan bien. No se tocan.
- **Las órdenes agrupadas por mesa** reparten platillos entre varios clientes usando el mismo
  vínculo roto. Al arreglarlo tienen que cuadrar los dos: el reparto por cliente y el total.
- **La respuesta crece** en un campo por platillo. Es aditivo: nada que lea hoy la respuesta se
  rompe.

## Qué no cambia

- El esquema de la base. La suborden ya sabe a qué orden pertenece; solo se estaba perdiendo al
  serializar.
- Los totales del reporte, que se calculan aparte y siempre fueron correctos.
