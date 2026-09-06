## Context

Segunda fase de la migración. La fundación provee `UnitOfWork` (transacción con `SET LOCAL app.tenant_id`), `currentDb()`, autenticación y contexto de tenant. Aquí se portan las rutas de negocio legacy (`ordenes.ts`, `catalogos.ts`, `inventario.ts`, `reportes.ts`) a módulos con capas.

## Goals / Non-Goals

**Goals**
- Contrato JSON idéntico al que consume `Gorditas_frontend/project/src/services/api.ts` (rutas, envolvente `{success,data,message}`, `_id`, nombres de campos, formas de paginación y reportes).
- Lógica de negocio fuera de Express y de Prisma (probable sin base de datos).
- Toda consulta dentro de `UnitOfWork`; los repositorios usan `currentDb()`.

**Non-Goals**
- Onboarding, billing y subida de imágenes (change siguiente).
- Cambios de pantalla en el frontend.

## Decisions

- **Casos de uso como clases pequeñas** con puertos inyectados por constructor; el router valida (Joi), llama al caso de uso y serializa con `toApi`.
- **Puertos por módulo**: `OrdenRepository` (cabeceras y árbol), `OrdenLineasRepository` (subórdenes y líneas), `StockRepository` (decremento atómico), `CatalogoLookup` (lecturas de platillo, guiso, producto, extra, mesa, tipo de orden). Interfaces pequeñas (ISP) en vez de un repositorio genérico.
- **Máquina de estados** en `modules/ordenes/domain/OrdenStatus.ts`: misma tabla por rol que el legacy, acepta `roles[]` (permite si cualquiera de los roles lo permite; `Admin` corto-circuita). Se elimina la rama `Empleado`.
- **Total de la orden**: un solo `UPDATE ordenes SET total = productos + platillos + extras` con subconsultas (bajo RLS).
- **Stock**: `UPDATE productos SET cantidad = cantidad - n WHERE id = ? AND activo AND cantidad >= n RETURNING ...`; cero filas → 400 "Producto no disponible o stock insuficiente". Borrar una línea de producto no devuelve stock (comportamiento legacy conservado).
- **Precios de servidor**: al agregar platillo/producto/extra el servidor toma nombre y precio del catálogo (`platillo.precio`, `producto.costo`, `extra.costo`); si el catálogo no tiene precio (> 0) usa el enviado por el cliente. Esto evita manipulación de precios desde el navegador.
- **Catálogos por registro**: `{ modelo → { delegate, searchable, include, flatten, schema } }`; alias con guion (`tipo-producto`). Borrado real; `P2003` → 409.
- **Usuarios**: `POST /api/usuarios` = `createUser` + `assignRole(projectGrantId)` + `sendSetPasswordLink` + espejo. `Encargado` solo puede crear/editar Mesero, Despachador y Cocinero. No se puede borrar a uno mismo ni al último Admin activo. `catalogos/usuario` GET devuelve el espejo (compatibilidad de lectura) y sus mutaciones responden 400 con mensaje que indica usar `/api/usuarios`.
- **Reportes**: SQL crudo en `PrismaReportesQuery` con rangos de día calculados en `APP_TZ`; las formas de respuesta (`ventasPorDia[]._id`, `productos[]._id.nombreProducto`, etc.) se conservan.
- **Validación**: `validateBody(schema)` en `shared/http/express/validate.ts` responde 400 `{ success:false, message:'Datos inválidos', details:[...] }`.

## Risks / Trade-offs

- Cambio de zona horaria en reportes: los días ahora coinciden con el calendario de México; el frontend ya agrupaba en `America/Mexico_City`, así que deja de haber desfase.
- 409 al borrar catálogos referenciados: el frontend muestra el mensaje del API; se puede desactivar el registro (`activo=false`) en vez de borrarlo.

## Migration Plan

Sin migraciones de esquema. Se montan las rutas en `app.ts` y se ejecutan las pruebas e2e.

## Open Questions

Ninguna.
