# Que el POS se pueda usar con el dedo, en un teléfono, con prisa

## Por qué

Medido en el navegador a 375×812, el flujo de tomar una orden tiene controles de **13×20 px**
(la casilla «Mesa pagada»), **14×28 px** (cerrar) y **56×28 px** (la acción principal del paso).
Al añadir un platillo, **diez objetivos quedan a menos de 8 px** de su vecino, uno a 3 px.

Las referencias coinciden en un mínimo de 44–48 px por lado: Apple HIG 44 pt, Material 48 dp,
WCAG 2.5.5 44 px, y NN/g 1 cm físico a partir de un dedo de 1.6–2 cm. WCAG 2.5.8 pone el piso
de cumplimiento en 24 px; la casilla está **por debajo incluso de eso**.

Pero el número suelto no es lo importante. Al auditar las 19 pantallas aparece que la causa es
una convención aplicada al revés: **el teléfono recibe el tamaño pequeño y la pantalla grande el
cómodo**. `text-xs sm:text-sm` aparece 83 veces, `text-sm sm:text-base` 57, `text-xs sm:text-base`
27, y hay unos 150 casos equivalentes de relleno. Son ~340 sitios que dicen «en móvil, más
apretado», exactamente donde los dedos son menos precisos y hay más prisa.

El reparto lo confirma: de 161 botones, 136 quedan bajo 44 px, y las peores pantallas son
**EditarOrden** (37 de 43), **NuevaOrden** (23 de 32), **Reportes**, **Cobrar** y **Despachar**
—las que se usan durante el servicio—, mientras que Planes y Configuración —las que se tocan una
vez al mes— están bien. Cuanto más se usa una pantalla bajo presión, más pequeños son sus
controles.

Hay además un riesgo que no es de tamaño sino de consecuencia: en NuevaOrden el control de
cantidad mide 32×32 px y **cambia de «reducir» a «eliminar platillo»** cuando la cantidad llega a
1, sin confirmación. Un toque impreciso borra la línea.

## Qué cambia

**Se invierte la convención en un solo sitio.** En vez de corregir ~340 clases a mano, una capa
de estilos para pantallas pequeñas eleva el tamaño base: el texto deja de bajar de 16 px y todo
control interactivo alcanza los 44 px de alto. Las pantallas grandes se quedan como están.

Se hace así a propósito. Repartir el arreglo por 340 sitios lo volvería imposible de revisar y,
peor, dejaría el criterio sin escribir en ninguna parte: el siguiente componente volvería a
nacer con `text-xs sm:text-sm`.

**Los inputs suben a 16 px en móvil.** Por debajo de eso, Safari en iOS hace zoom al enfocar el
campo y descuadra la pantalla; hoy pasa en el campo de cliente del flujo de órdenes.

**Se separa reducir de eliminar.** Bajar de 1 a 0 deja de ser un toque más en el mismo botón.

## Qué no cambia

- El diseño visual, los colores y la disposición de las pantallas.
- El comportamiento en tablet y escritorio.
- La estructura de los componentes: no se reescribe ninguna pantalla.

## Qué queda fuera

- Rediseñar la barra lateral, que en móvil ocupa ~18% del ancho mostrando solo iconos. Es un
  cambio de navegación, más grande, y merece su propio análisis.
- Mover las acciones principales a la zona baja del pulgar. Vale la pena —los objetivos de abajo
  se aciertan entre un 30 y un 50% más— pero es rediseño, no ergonomía de base.
