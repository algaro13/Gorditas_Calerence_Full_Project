# Manual de Ayuda

La página `/ayuda` (menú del administrador) explica el sistema por tareas, con pasos numerados y
capturas que marcan dónde pulsar.

- **Textos**: `Gorditas_frontend/project/src/pages/ayuda/contenido.ts`. Si un botón cambia de
  nombre, cambia también el texto que lo menciona.
- **Capturas**: `Gorditas_frontend/project/public/ayuda/*.jpg`. Las genera
  `e2e/manual.capturas.ts` contra el restaurante de demostración **local**, a tamaño de teléfono,
  con un recuadro rojo (numerado si hay varios) sobre lo que hay que pulsar.

## Regenerar las capturas

Con el entorno local levantado (backend en el 5000, frontend en el 5173 y `npm run dev:seed`):

```bash
cd Gorditas_frontend/project
CAPTURAS=1 npx playwright test --project=manual
```

El proyecto `manual` solo existe con `CAPTURAS=1`, así que no corre con la suite normal. El script
crea una orden en la Mesa 2 a nombre de «María López», la lleva por cocina y despacho y al final la
cobra, para no dejar pendientes. En las imágenes, la dirección `localhost` se sustituye por
`https://demo.cuadranova.com`.

La prueba `e2e/ayuda.spec.ts` comprueba que la página se abre desde el menú, que el índice lleva a
cada sección y que todas las capturas cargan.
