## 1. Infraestructura de capas e interfaces

- [x] 1.1 Crear carpetas `src/controllers/`, `src/services/`, `src/repositories/`, `src/domain/`, `src/interfaces/`
- [x] 1.2 Definir interfaces de repositorios en `src/interfaces/repositories.ts` (IOrdenRepository, IProductoRepository, IUsuarioRepository, ICatalogoRepository)
- [x] 1.3 Definir interfaces de servicios en `src/interfaces/services.ts` (IAuthService, IOrdenesService, IInventarioService, IReportesService, ICatalogosService)
- [x] 1.4 Crear `src/composition-root.ts` que instancie repositories y services y los exporte listos para usar

## 2. Configuración centralizada

- [x] 2.1 Crear `appsettings.json` en la raíz del backend con secciones: `database` (uri, options), `jwt` (secret, expiresIn), `server` (port)
- [x] 2.2 Crear interfaz `AppSettings` en `src/interfaces/config.ts` con tipado fuerte para todas las secciones de configuración
- [x] 2.3 Crear `src/config/app-settings.ts` que cargue `appsettings.json`, mergee con variables de entorno (env vars tienen prioridad) y exporte el objeto tipado
- [x] 2.4 Agregar validación al startup: si falta una configuración requerida (ej: database.uri), la app falla con mensaje claro
- [x] 2.5 Refactorizar `src/config/database.ts` para recibir la configuración por parámetro en lugar de leer `process.env` directamente

## 3. Módulo de dominio (reglas de negocio puras)

- [x] 3.1 Crear `src/domain/orden-status.ts` con la función `validateStatusTransition(currentStatus, newStatus, userRole)` extraída de `routes/ordenes.ts`
- [x] 3.2 Crear `src/domain/orden-calculator.ts` con la función `calculateOrdenTotal(productImportes, platilloImportes, extraImportes)` como función pura
- [x] 3.3 Crear `src/domain/inventory-validator.ts` con la función `validateInventoryAvailability(currentStock, requestedQuantity)`

## 4. Capa de repositorios

- [x] 4.1 Crear `src/repositories/orden.repository.ts` implementando IOrdenRepository (queries de Orden, Suborden, OrdenDetalleProducto, OrdenDetallePlatillo, OrdenDetalleExtra)
- [x] 4.2 Crear `src/repositories/producto.repository.ts` implementando IProductoRepository (queries de Producto e inventario)
- [x] 4.3 Crear `src/repositories/usuario.repository.ts` implementando IUsuarioRepository (queries de Usuario)
- [x] 4.4 Crear `src/repositories/catalogo.repository.ts` implementando ICatalogoRepository (queries de Guiso, Platillo, Extra, Mesa, TipoProducto, etc.)

## 5. Capa de servicios

- [x] 5.1 Crear `src/services/auth.service.ts` con lógica de login y perfil (recibe IUsuarioRepository + config JWT por constructor)
- [x] 5.2 Crear `src/services/ordenes.service.ts` con lógica de CRUD de órdenes, subórdenes, productos, platillos, extras y cambios de estatus (usa domain functions + IOrdenRepository + IProductoRepository)
- [x] 5.3 Crear `src/services/inventario.service.ts` con lógica de consulta, recepción y ajuste de inventario
- [x] 5.4 Crear `src/services/reportes.service.ts` con lógica de generación de reportes
- [x] 5.5 Crear `src/services/catalogos.service.ts` con lógica de CRUD de catálogos

## 6. Capa de controladores

- [x] 6.1 Crear `src/controllers/auth.controller.ts` — extrae params del request, llama a AuthService, formatea response HTTP
- [x] 6.2 Crear `src/controllers/ordenes.controller.ts` — delega a OrdenesService, maneja códigos HTTP (404, 400, 403)
- [x] 6.3 Crear `src/controllers/inventario.controller.ts` — delega a InventarioService
- [x] 6.4 Crear `src/controllers/reportes.controller.ts` — delega a ReportesService
- [x] 6.5 Crear `src/controllers/catalogos.controller.ts` — delega a CatalogosService

## 7. Refactorizar rutas existentes

- [x] 7.1 Refactorizar `src/routes/auth.ts` para que solo defina rutas y middleware, delegando a `auth.controller.ts`
- [x] 7.2 Refactorizar `src/routes/ordenes.ts` para que solo defina rutas y middleware, delegando a `ordenes.controller.ts`
- [x] 7.3 Refactorizar `src/routes/inventario.ts` para que solo defina rutas y middleware, delegando a `inventario.controller.ts`
- [x] 7.4 Refactorizar `src/routes/reportes.ts` para que solo defina rutas y middleware, delegando a `reportes.controller.ts`
- [x] 7.5 Refactorizar `src/routes/catalogos.ts` para que solo defina rutas y middleware, delegando a `catalogos.controller.ts`

## 8. Integración y verificación

- [x] 8.1 Actualizar `src/server.ts` para usar el composition root y la configuración centralizada
- [x] 8.2 Verificar que el proyecto compila sin errores (`npm run build`)
- [x] 8.3 Verificar manualmente que los endpoints principales responden correctamente (health, login, listar órdenes, crear orden)
- [x] 8.4 Actualizar el README del backend con la nueva estructura de carpetas y convenciones
