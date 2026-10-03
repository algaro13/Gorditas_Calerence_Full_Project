## 1. Implementación

- [x] 1.1 `GET /api/billing/status` añade `diasSobreCupo`
- [x] 1.2 Componente `AvisoSobreCupo` extraído de `UsuariosPanel`, usado también en `/suscripcion`
- [x] 1.3 Confirmación de cambio de plan: advertencia al bajar por debajo de los usuarios activos
- [x] 1.4 `docs/stripe-produccion.md`
- [x] 1.5 Pruebas (backend y navegador)

## 2. Verificación

- [x] 2.1 Navegador: bajar de plan con usuarios de más advierte; subir no
- [x] 2.2 Navegador: `/suscripcion` y Catálogos muestran el mismo aviso con el restaurante excedido
- [x] 2.3 Suites en verde

## 3. Cierre

- [x] 3.1 Commit y `openspec archive`
