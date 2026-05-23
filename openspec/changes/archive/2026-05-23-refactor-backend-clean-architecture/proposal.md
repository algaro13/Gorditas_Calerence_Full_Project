## Why

El backend actual concentra toda la lógica de negocio directamente en los archivos de rutas (route handlers). Esto genera archivos de 400+ líneas con responsabilidades mezcladas: validación, acceso a datos, reglas de negocio y formateo de respuestas en un solo lugar. Esto dificulta el mantenimiento, la testabilidad y la incorporación de nuevas funcionalidades sin riesgo de regresiones.

Refactorizar hacia una arquitectura limpia con principios SOLID permite separar responsabilidades, facilitar pruebas unitarias y hacer el código más predecible y extensible.

## What Changes

- Introducir una capa de **servicios** (Services) que encapsule la lógica de negocio, separándola de los controladores HTTP
- Introducir una capa de **repositorios** (Repositories) que abstraiga el acceso a datos (Mongoose), permitiendo sustituir la fuente de datos sin afectar la lógica de negocio
- Crear **controladores** (Controllers) dedicados que solo se encarguen de recibir requests, delegar al servicio y formatear la respuesta HTTP
- Extraer las reglas de transición de estatus de órdenes a un módulo de dominio independiente
- Definir **interfaces/tipos** claros para cada capa (contratos entre capas)
- Reorganizar la estructura de carpetas del backend siguiendo convenciones de Clean Architecture

## Capabilities

### New Capabilities
- `layered-architecture`: Estructura de capas (controllers → services → repositories) con separación clara de responsabilidades
- `domain-logic`: Módulo de dominio que encapsula reglas de negocio puras (transiciones de estatus, cálculos de totales, validaciones de inventario)
- `app-configuration`: Sistema de configuración centralizado mediante `appsettings.json` para gestionar conexiones externas (MongoDB, JWT, etc.) de forma tipada y desacoplada

### Modified Capabilities
<!-- No hay specs existentes que modificar ya que es la primera vez que se documentan -->

## Impact

- **Código afectado**: Todos los archivos en `src/routes/` se refactorizan en controllers + services + repositories
- **Estructura de carpetas**: Se reorganiza `src/` con nuevas carpetas (`controllers/`, `services/`, `repositories/`, `domain/`, `interfaces/`)
- **APIs**: Los endpoints HTTP no cambian (mismas rutas, mismos contratos de request/response) — es un refactor interno
- **Configuración**: Se introduce `appsettings.json` como fuente centralizada de configuración (conexión MongoDB, JWT secret, puerto, etc.), reemplazando el uso directo de `process.env` disperso en el código
- **Dependencias**: No se agregan dependencias nuevas; se aprovecha TypeScript para interfaces
- **Riesgo**: Medio — se mueve código existente sin cambiar comportamiento, pero requiere verificación de que todos los flujos siguen funcionando
