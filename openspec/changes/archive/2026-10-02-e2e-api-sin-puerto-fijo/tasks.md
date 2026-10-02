## 1. Implementación

- [x] 1.1 `e2e/api.ts`: dirección de la API con la misma precedencia que la app y función `llamarApi`
- [x] 1.2 `promociones.spec.ts` y `reportes.spec.ts` usan el ayudante
- [x] 1.3 `docs/local-testing.md`: cómo correr las pruebas con el backend en otro puerto

## 2. Verificación

- [x] 2.1 Sin puertos de la API escritos a mano en `e2e/`
- [x] 2.2 `promociones` y `reportes` en verde con el backend en el 5001
- [x] 2.3 Sin variables se resuelve lo de `.env.development`
- [x] 2.4 Suite completa de navegador en verde (57 de 58 a la primera; la que faltó, de
  `navegacion.spec.ts`, es intermitente y ajena: pasó 3 de 3 al repetirla)

## 3. Cierre

- [x] 3.1 Commit y `openspec archive`
