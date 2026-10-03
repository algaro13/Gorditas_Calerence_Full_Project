# Los planes y sus precios, en un solo lugar

## Por qué

Los precios ($299, $599, $999) y los límites de usuarios estaban escritos en cuatro sitios: la
pantalla de planes, la landing, el backend (`PLAN_LIMITS` y `PLAN_CATALOG`) y Stripe. El correo de
aviso ya los tomaba del backend; las pantallas no. Cambiar un precio dejaba alguna versión vieja, y
nada lo detectaba: ni siquiera que Stripe cobrara otra cantidad que la anunciada.

Al juntarlos apareció algo peor: **cada plan tenía tres listas de características distintas**, y
prometían por plan cosas que no se diferencian por plan —reportes, mesas, extras, Excel, logo y
colores están en los tres— y dos que no existen: «Múltiples sucursales» y «Dashboard avanzado». Lo
único que cambia de un plan a otro es el número de usuarios.

## Qué cambia

- **Una sola fuente: `PLAN_CATALOG` del backend**, servido por `GET /api/billing/plans` (público).
  Precio, moneda, usuarios, si son ilimitados, si es el más popular y sus características.
- **Características honestas**, aprobadas por el dueño del producto:
  - Básico: órdenes, cocina y despacho; cobro y caja; inventario y reportes (con Excel); tu logo y
    colores.
  - Profesional: todo lo de Básico; para equipos medianos.
  - Empresarial: todo lo de Profesional; sin límite de personal.
  - Sin niveles de soporte: el dueño del producto pidió no prometerlos en los planes.
- **`/planes` y la landing leen el catálogo** en lugar de tener su propia copia, con un estado de
  carga y un aviso si no se pudo cargar.
- **«Ilimitado» deja de ser un 999 escrito en varios sitios**: el backend lo nombra
  (`USUARIOS_ILIMITADOS`) y lo informa (`usuariosIlimitados` en el catálogo y en el estado).
- **Al arrancar con Stripe, el backend compara cada `STRIPE_PRICE_*` con el catálogo** (importe,
  moneda y periodicidad) y registra un error por cada diferencia. No impide arrancar: avisa.

## Qué no cambia

Los precios, los límites y las reglas del cupo.

## Criterios de aceptación

1. Ningún precio ni límite de usuarios queda escrito en el frontend.
2. Si el catálogo dice otro precio, `/planes` y la landing lo muestran sin tocar el frontend.
3. Las tres pantallas muestran la misma lista de características, la aprobada.
4. Un precio de Stripe distinto del catálogo queda registrado como error al arrancar.
5. Suites del backend y de navegador en verde.
