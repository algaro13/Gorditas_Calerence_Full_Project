## 1. Backend

- [x] 1.1 `USUARIOS_ILIMITADOS` en el dominio; `PLAN_LIMITS` y el correo lo usan
- [x] 1.2 `PLAN_CATALOG` con las características aprobadas, `popular` y `usuariosIlimitados`
- [x] 1.3 `GET /api/billing/status` añade `usuariosIlimitados`
- [x] 1.4 Comparación de los precios de Stripe con el catálogo al arrancar
- [x] 1.5 Pruebas

## 2. Frontend

- [x] 2.1 `usePlanes()` lee `/billing/plans`, con carga y error
- [x] 2.2 `/planes` y la landing usan el catálogo; fuera las copias
- [x] 2.3 `/suscripcion` usa `usuariosIlimitados` en vez del 999
- [x] 2.4 Prueba de navegador: un precio cambiado en el catálogo se ve en las dos pantallas

## 3. Verificación

- [x] 3.1 Navegador: `/planes` y la landing con el catálogo real
- [x] 3.2 Suites en verde

## 4. Cierre

- [x] 4.1 Commit y `openspec archive`
