## Why

El frontend actual tiene componentes de página monolíticos (NuevaOrden: 2,185 líneas, Dashboard: 736, Cobrar: 774) que mezclan lógica de negocio, fetching de datos, manejo de estado y renderizado de UI en un solo archivo. El servicio API es una clase "Dios" de 250+ líneas que maneja todos los dominios. No hay custom hooks, no hay componentes UI reutilizables, y se usa `any` extensivamente. Esto hace el código difícil de mantener, imposible de testear y propenso a bugs al agregar features.

Se necesita refactorizar hacia una arquitectura modular con separación de responsabilidades, siguiendo principios SOLID adaptados a React.

## What Changes

- Dividir el servicio API monolítico en servicios por dominio (`auth.service.ts`, `ordenes.service.ts`, `inventario.service.ts`, `catalogos.service.ts`, `reportes.service.ts`)
- Crear custom hooks para lógica de datos y negocio (`useOrdenes`, `useInventario`, `useCatalogos`, `usePolling`)
- Extraer componentes UI reutilizables (`Button`, `Modal`, `Table`, `FormInput`, `LoadingSpinner`, `ErrorMessage`)
- Reorganizar páginas en features por dominio, descomponiendo los componentes monolíticos en sub-componentes enfocados
- Eliminar el uso de `any` en los servicios y hooks, usando tipos genéricos correctos
- Crear un sistema de configuración para la URL del API (en lugar de hardcodearla)

## Capabilities

### New Capabilities
- `frontend-service-layer`: Servicios API divididos por dominio con tipado fuerte y configuración centralizada
- `frontend-hooks-layer`: Custom hooks que encapsulan lógica de datos, polling y estado de formularios
- `frontend-ui-components`: Librería de componentes UI reutilizables con interfaces consistentes

### Modified Capabilities

## Impact

- **Código afectado**: Todos los archivos en `src/pages/`, `src/services/api.ts`, y se crean nuevas carpetas (`src/services/`, `src/hooks/`, `src/components/ui/`, `src/features/`)
- **APIs**: No cambian — el frontend sigue consumiendo los mismos endpoints del backend
- **Dependencias**: No se agregan librerías nuevas (se usa React puro + hooks)
- **Riesgo**: Alto — se mueve y reestructura mucho código. Se debe hacer por dominio funcional para poder verificar incrementalmente
- **UX**: Sin cambios visibles para el usuario — es un refactor interno
