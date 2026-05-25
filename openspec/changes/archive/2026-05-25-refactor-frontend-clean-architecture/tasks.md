## 1. Configuración y estructura base

- [x] 1.1 Crear `src/config/app-config.ts` con URL del API desde `VITE_API_URL`, polling interval, y token key
- [x] 1.2 Crear carpetas: `src/services/`, `src/hooks/`, `src/components/ui/`, `src/types/`
- [x] 1.3 Dividir `src/types/index.ts` en archivos por dominio: `auth.types.ts`, `orden.types.ts`, `catalogo.types.ts`, `inventario.types.ts`, `reportes.types.ts`, `ui.types.ts` con un `index.ts` que re-exporte todo

## 2. Cliente HTTP base

- [x] 2.1 Crear `src/services/api-client.ts` con clase `ApiClient` que tenga métodos `get<T>`, `post<T>`, `put<T>`, `delete<T>` con manejo de token, headers y errores tipados
- [x] 2.2 Definir interfaz `ApiResponse<T>` con `success`, `data?`, `error?`, `message?` (reemplazando el tipo suelto actual)

## 3. Servicios por dominio

- [x] 3.1 Crear `src/services/auth.service.ts` con métodos: `login`, `getProfile`, `logout`
- [x] 3.2 Crear `src/services/ordenes.service.ts` con métodos: `list`, `getById`, `create`, `createSuborden`, `addProducto`, `addPlatillo`, `addExtra`, `updateStatus`, `markListo`, `markEntregado`, `delete`, etc.
- [x] 3.3 Crear `src/services/inventario.service.ts` con métodos: `getInventario`, `recibirProductos`, `ajustarInventario`
- [x] 3.4 Crear `src/services/catalogos.service.ts` con métodos genéricos: `list<T>`, `create<T>`, `update<T>`, `delete`, `getNextPedidoNumber`
- [x] 3.5 Crear `src/services/reportes.service.ts` con métodos: `getVentas`, `getInventario`, `getGastos`, `createGasto`, `deleteGasto`, `getProductosVendidos`
- [x] 3.6 Crear `src/services/index.ts` que re-exporte todos los servicios

## 4. Custom hooks

- [x] 4.1 Crear `src/hooks/useApi.ts` — hook genérico que encapsula fetch + loading + error + refresh
- [x] 4.2 Crear `src/hooks/usePolling.ts` — hook para polling periódico con cleanup en unmount
- [x] 4.3 Crear `src/hooks/useCatalogos.ts` — hook que carga un catálogo por modelo con CRUD
- [x] 4.4 Crear `src/hooks/useOrdenes.ts` — hook para listar/crear/actualizar órdenes con polling opcional
- [x] 4.5 Crear `src/hooks/useInventario.ts` — hook para operaciones de inventario
- [x] 4.6 Crear `src/hooks/index.ts` que re-exporte todos los hooks

## 5. Componentes UI reutilizables

- [x] 5.1 Crear `src/components/ui/Button.tsx` con variants (primary, secondary, danger), sizes, loading y disabled
- [x] 5.2 Crear `src/components/ui/Modal.tsx` con overlay, título, contenido, footer y sizes
- [x] 5.3 Crear `src/components/ui/Table.tsx` con columns definition, data array y empty state
- [x] 5.4 Crear `src/components/ui/FormInput.tsx` con label, error, tipos (text, number, select)
- [x] 5.5 Crear `src/components/ui/LoadingSpinner.tsx` con opción fullPage
- [x] 5.6 Crear `src/components/ui/ErrorMessage.tsx` con mensaje y botón retry opcional
- [x] 5.7 Crear `src/components/ui/index.ts` que re-exporte todos los componentes UI

## 6. Migración del AuthContext

- [x] 6.1 Refactorizar `src/context/AuthContext.tsx` para usar `authService` del nuevo servicio en lugar de `apiService` directamente

## 7. Verificación

- [x] 7.1 Verificar que el proyecto compila sin errores (`npm run build`)
- [x] 7.2 Verificar que la app sigue funcionando correctamente en el navegador (login, navegación, catálogos)
