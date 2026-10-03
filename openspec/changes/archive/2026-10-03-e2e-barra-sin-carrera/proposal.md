# Las pruebas de la barra esperan a que la barra exista

## Por qué

`la barra no tapa el último control de la pantalla` falló una vez de cuatro con «no hay barra que
comprobar», y pasó al repetirla. La prueba entra a `/catalogos`, espera `networkidle` y mide en
seguida. Pero `networkidle` solo dice que la red se calmó, no que React terminó de dibujar: si mide
antes de que el layout monte la barra, no la encuentra.

`el hueco de abajo cubre la altura real de la barra` tiene la misma carrera, y además lee
`barra.offsetHeight` sin comprobar que la barra exista, así que cuando la pierde revienta con un
error de JavaScript en vez de decir qué pasó.

Una prueba intermitente es peor que ninguna: enseña a repetir la suite hasta que pase, y entonces
el día que falle de verdad nadie la cree.

## Qué cambia

Las dos pruebas esperan, antes de medir, a que la barra esté visible y a que la pantalla tenga su
contenido (el título de Catálogos). Esperan con los `expect` de Playwright, que reintentan, en vez
de con tiempos fijos.

## Qué no cambia

Lo que cada prueba afirma.

## Criterios de aceptación

1. Las dos pruebas esperan a la barra antes de medirla.
2. `navegacion.spec.ts` pasa 10 veces seguidas.
3. La suite completa de navegador pasa.
