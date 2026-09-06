## Why

Con la fundación (PostgreSQL + RLS + Zitadel) archivada, el API solo expone `/health` y `/api/tenants`. Las pantallas del POS (nueva orden, cocina, despacho, cobro, catálogos, inventario, reportes) necesitan sus rutas de negocio de vuelta, ahora sobre Prisma, dentro del contexto de tenant y con la arquitectura por módulos. Esta fase porta ese comportamiento conservando el contrato JSON que consume el frontend.

## What Changes

- Módulo `ordenes`: árbol orden → suborden → platillo → extra y productos directos; máquina de estados por rol (portada de `validateStatusTransition`), recálculo de total en un solo `UPDATE`, decremento atómico de stock, cascada al borrar. Precios y nombres de las líneas los toma el servidor del catálogo (no del cliente).
- Módulo `catalogos`: CRUD genérico por registro para guiso, tipos, producto, platillo, extra, tipo de orden, mesa, tipo de gasto y gasto, con búsqueda, paginación y aplanado de joins (`nombreTipoProducto`, ...). `tipousuario` devuelve la lista fija de roles. `GET /catalogos/pedido/next-number` usa el contador por tenant.
- Módulo `usuarios`: alta, cambio de rol, activación y baja del personal a través del `IdentityProvider` (Zitadel), espejo en `tenant_users`, límite `maxUsuarios` del plan. Reemplaza `catalogos/usuario` con contraseña.
- Módulo `inventario`: consulta con alertas de stock, recepción por lote en una transacción y ajuste absoluto.
- Módulo `reportes`: ventas por día y tipo, inventario, gastos (consulta, alta, baja) y más vendidos con SQL en la zona horaria del negocio (`America/Mexico_City`).
- Middleware `validateBody` (Joi) y mapeo de errores de Prisma a 404/409.
- **Cambios de comportamiento** respecto al legacy: días de reportes en `America/Mexico_City` (antes UTC); `productos-vendidos` cuenta órdenes `Entregada` y `Pagada` (antes solo `Entregada`); borrar un catálogo referenciado por órdenes responde 409 (antes borraba dejando referencias rotas); las líneas de orden usan el precio del catálogo.

## Capabilities

### New Capabilities
- `order-management`: ciclo de vida de órdenes, líneas, totales y transiciones por rol.
- `catalog-management`: catálogos del restaurante y numeración de pedidos.
- `staff-management`: personal del restaurante gestionado en el proveedor de identidad con espejo local y límite por plan.
- `inventory-management`: existencias, recepción y ajuste.
- `sales-reporting`: reportes de ventas, inventario, gastos y más vendidos.

### Modified Capabilities
- `tenant-data-isolation`: todas las rutas de negocio pasan por `authenticate → tenantContext → planGuard` y ejecutan dentro de `UnitOfWork`.

## Impact

- **Backend**: `src/modules/{ordenes,catalogos,usuarios,inventario,reportes}/{domain,application,infrastructure,http}`, `src/shared/http/express/validate.ts`, montaje en `src/app.ts`.
- **Frontend**: sin cambios en esta fase; `catalogos/usuario` (POST/PUT/DELETE) queda deshabilitado hasta que el frontend use `/api/usuarios` (change de frontend).
- **Pruebas**: unit (máquina de estados, totales), e2e por módulo con `FakeIdentityProvider`.
