## 1. El motivo, desde el backend

- [ ] 1.1 `GET /api/tenants/me` dice si el acceso está bloqueado y por qué
- [ ] 1.2 El motivo sale del mismo código que bloquea las rutas

## 2. El SPA

- [ ] 2.1 Con el acceso bloqueado, lleva a la pantalla de planes
- [ ] 2.2 La pantalla de planes explica qué pasó
- [ ] 2.3 Un 403 de plan en cualquier llamada hace lo mismo
- [ ] 2.4 Salir de sesión sigue funcionando

## 3. De paso

- [ ] 3.1 El botón de «Crear Nuevo pedido» deja de salirse del diálogo

## 4. Verificación

- [ ] 4.1 Una prueba de backend afirma el motivo en la respuesta
- [ ] 4.2 Un restaurante con la prueba vencida ve la explicación, no un POS vacío
- [ ] 4.3 Uno con el plan al día no nota nada
- [ ] 4.4 Las dos suites en verde

## 5. Cierre

- [ ] 5.1 Commit y `openspec archive`
