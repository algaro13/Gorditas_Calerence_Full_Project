# Las pruebas de navegador llaman a la misma API que la app

## Por qué

Tres pruebas de navegador (`promociones.spec.ts` y dos de `reportes.spec.ts`) preparan y limpian
datos llamando a la API directamente, con `http://localhost:5000` escrito a mano. La app, en
cambio, toma la dirección de `VITE_API_URL`.

Mientras las dos coincidan no se nota. El 2026-10-02 el puerto 5000 lo ocupaba otro proyecto, el
backend se levantó en el 5001 y la app funcionó, pero esas cinco pruebas fallaron con «Failed to
fetch»: le hablaban a un servidor que no era el nuestro. Un fallo así culpa a la funcionalidad de
algo que es del entorno.

Además, la función que llama a la API estaba copiada tres veces.

## Qué cambia

- Un ayudante `e2e/api.ts` resuelve la dirección de la API **igual que la app**: `E2E_API_URL` si
  se define, si no `VITE_API_URL` con la misma precedencia que Vite (variable de entorno primero,
  luego `.env.development`), y por último el mismo valor por omisión que `app-config.ts`.
- Ese ayudante expone una sola función para llamar a la API con el token de la sesión, y las tres
  copias pasan a usarla.
- `docs/local-testing.md` dice cómo correr las pruebas con el backend en otro puerto.

## Qué no cambia

Lo que cada prueba afirma, ni la dirección por omisión: sin variables, todo sigue en el 5000.

## Criterios de aceptación

1. Ninguna prueba de `e2e/` tiene un puerto de la API escrito a mano.
2. Con el backend en el 5001 y `VITE_API_URL` apuntándole, `promociones` y `reportes` pasan.
3. Sin variables, la dirección resuelta es la de `.env.development`.
4. La suite completa de navegador pasa.
