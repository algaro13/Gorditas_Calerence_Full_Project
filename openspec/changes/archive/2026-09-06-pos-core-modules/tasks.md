## 1. Base compartida

- [x] 1.1 `src/shared/http/express/validate.ts` (`validateBody`, `validateQuery`) y helper `dayRange(fecha, tz)` en `shared/utils/dates.ts`
- [x] 1.2 Montaje en `src/app.ts` de `/api/ordenes`, `/api/catalogos`, `/api/usuarios`, `/api/inventario`, `/api/reportes` con `[authenticate, tenantContext, planGuard]`; `container.ts` construye los módulos

## 2. Módulo ordenes

- [x] 2.1 `domain/OrdenStatus.ts` (estatus, tabla de transiciones por rol, `canTransition(current, next, roles)`) y `domain/OrdenTotal.ts`
- [x] 2.2 Puertos `OrdenRepository`, `OrdenLineasRepository`, `StockRepository`, `CatalogoLookup`
- [x] 2.3 Casos de uso: ListarOrdenes, ObtenerOrden, CrearOrden, AgregarSuborden, AgregarPlatillo, AgregarProducto, AgregarExtra, CambiarEstatus, VerificarOrden, ActualizarFechaHora, MarcarLinea, ActualizarNotaPlatillo, EliminarLinea, EliminarOrden
- [x] 2.4 Adaptadores Prisma (`PrismaOrdenRepository`, `PrismaOrdenLineasRepository`, `PrismaStockRepository`, `PrismaCatalogoLookup`) con `currentDb()`; total en un solo `UPDATE`; stock atómico
- [x] 2.5 `http/ordenes.router.ts` + `ordenes.schemas.ts` con las mismas rutas y mensajes del legacy
- [x] 2.6 Pruebas: unit de la máquina de estados; e2e del flujo completo (crear, líneas, total, stock, transiciones por rol, Surtida marca listo, borrado en cascada)

## 3. Módulo catalogos

- [x] 3.1 Registro de catálogos (`catalogos.registry.ts`) con delegate, campos buscables, include/flatten y esquema Joi
- [x] 3.2 Casos de uso Listar/Crear/Actualizar/Eliminar sobre `CatalogoRepository` genérico Prisma
- [x] 3.3 Router con alias, `tipousuario` fijo, `pedido/next-number`, `usuario` en modo compatibilidad
- [x] 3.4 Pruebas e2e: CRUD, búsqueda, 400 modelo inválido, 409 al borrar referenciado, contador de pedido por tenant

## 4. Módulo usuarios

- [x] 4.1 Puerto `StaffRepository` (espejo) y casos de uso ListarPersonal, InvitarUsuario, ActualizarUsuario, EliminarUsuario, ReenviarInvitacion con reglas de rol, límite de plan y último Admin
- [x] 4.2 Adaptador Prisma y router `/api/usuarios`
- [x] 4.3 Pruebas e2e con `FakeIdentityProvider`

## 5. Módulo inventario

- [x] 5.1 Casos de uso ConsultarInventario, RecibirProductos, AjustarInventario; adaptador Prisma; router con `isEncargado`
- [x] 5.2 Pruebas e2e

## 6. Módulo reportes

- [x] 6.1 `PrismaReportesQuery` (ventas, inventario, gastos, más vendidos) con SQL en `APP_TZ`
- [x] 6.2 Casos de uso y router (`isEncargado`), gastos POST/DELETE
- [x] 6.3 Pruebas e2e de formas de respuesta y del corte de día en Mexico City

## 7. Verificación

- [x] 7.1 `npm run lint`, `npm run typecheck`, `npm test` en verde
- [x] 7.2 Backend en local contra Zitadel real: `/api/catalogos/mesa` y `/api/ordenes` con token de máquina vinculado a un tenant de prueba
