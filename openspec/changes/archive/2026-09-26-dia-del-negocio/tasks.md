## 1. La zona horaria

- [x] 1.1 `GET /api/tenants/me` devuelve la zona horaria del negocio
- [x] 1.2 El SPA la guarda junto al restaurante

## 2. El día

- [x] 2.1 El filtro por omisión de Reportes usa el día del negocio
- [x] 2.2 La fecha de la caja también
- [x] 2.3 Sin zona conocida, la del navegador; nunca UTC

## 3. Verificación

- [x] 3.1 Una prueba de backend afirma la zona en la respuesta
- [x] 3.2 El día por omisión coincide con el día del negocio, sea la hora que sea
- [x] 3.3 Fuera el ensanche a mano de las pruebas de navegador — *se conserva, por otra razón*:
  ya no esquiva el fallo, sino la posibilidad de que hoy no haya ventas. Quitarlo dejaría esas
  pruebas atadas a que otra de la suite cree una orden antes, que es peor
- [x] 3.4 Las dos suites en verde

## 4. Cierre

- [x] 4.1 Commit y `openspec archive`
