## 1. Backend

- [ ] 1.1 `idTipoOrden` opcional en la entrada de crear orden
- [ ] 1.2 Sin tipo, usar el primero activo del catálogo del restaurante
- [ ] 1.3 Con tipo, seguir validando contra el catálogo del restaurante
- [ ] 1.4 Catálogo vacío: error que lo diga, distinto de "tipo no válido"

## 2. Frontend

- [ ] 2.1 Dejar de mandar el `idTipoOrden: 1` fijo

## 3. Pruebas

- [ ] 3.1 Sin tipo: la orden se crea con el primero activo del restaurante
- [ ] 3.2 Con un tipo de otro restaurante: se rechaza
- [ ] 3.3 Restaurante sin tipos activos: error propio
- [ ] 3.4 Regresión: la suite completa sigue verde
- [ ] 3.5 En el navegador: crear una orden de verdad en el tenant local

## 4. Cierre

- [ ] 4.1 Commit y `openspec archive`
