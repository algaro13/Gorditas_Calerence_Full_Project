## Context

El backend actual (`Gorditas_Calerence_Backend`) es una API REST con Express + TypeScript + MongoDB (Mongoose). Toda la lógica vive en 5 archivos de rutas (`src/routes/`) que mezclan:
- Parsing de request y formateo de response
- Queries a MongoDB (Mongoose)
- Reglas de negocio (transiciones de estatus, cálculos de totales, validación de inventario)
- Manejo de errores

El archivo `ordenes.ts` tiene 400+ líneas con funciones helper internas (`updateOrdenTotal`, `validateStatusTransition`) que son lógica de dominio pura embebida en el router.

No hay tests unitarios. La única forma de verificar comportamiento es ejecutar el servidor completo.

## Goals / Non-Goals

**Goals:**
- Separar la lógica en capas claras: Controllers → Services → Repositories
- Extraer reglas de negocio puras a un módulo de dominio testeable sin dependencias externas
- Definir interfaces TypeScript como contratos entre capas (Dependency Inversion)
- Mantener los mismos endpoints HTTP y contratos de API (zero breaking changes para el frontend)
- Hacer el código testeable unitariamente sin necesidad de MongoDB

**Non-Goals:**
- No se migra a otro framework (se mantiene Express)
- No se implementa inyección de dependencias con contenedor IoC (se usa inyección manual por constructor)
- No se cambia la base de datos ni el ORM (se mantiene Mongoose)
- No se agregan tests en este cambio (se deja la estructura lista para agregarlos después)
- No se refactoriza el frontend
- No se modifican los modelos de Mongoose existentes

## Decisions

### 1. Estructura de carpetas por capas (no por feature)

```
src/
├── controllers/        # Reciben HTTP request, delegan al service, formatean response
│   ├── auth.controller.ts
│   ├── ordenes.controller.ts
│   ├── inventario.controller.ts
│   ├── reportes.controller.ts
│   └── catalogos.controller.ts
├── services/           # Lógica de negocio, orquestación
│   ├── auth.service.ts
│   ├── ordenes.service.ts
│   ├── inventario.service.ts
│   ├── reportes.service.ts
│   └── catalogos.service.ts
├── repositories/       # Acceso a datos (Mongoose queries)
│   ├── orden.repository.ts
│   ├── producto.repository.ts
│   ├── usuario.repository.ts
│   └── catalogo.repository.ts
├── domain/             # Reglas de negocio puras (sin dependencias externas)
│   ├── orden-status.ts         # Transiciones de estatus por rol
│   └── orden-calculator.ts    # Cálculo de totales
├── interfaces/         # Contratos TypeScript entre capas
│   ├── repositories.ts
│   └── services.ts
├── routes/             # Solo definición de rutas (router.get/post → controller)
├── middleware/         # Sin cambios
├── models/             # Sin cambios
├── config/             # Configuración (database.ts, app-settings.ts, appsettings.json)
├── types/              # Sin cambios
└── utils/              # Sin cambios
```

**Rationale**: El proyecto tiene 5 dominios funcionales bien definidos (auth, ordenes, inventario, reportes, catalogos). Una estructura por capas es más simple de entender para un equipo pequeño y refleja directamente los principios SOLID. Si el proyecto crece, se puede migrar a feature-based después.

### 2. Inyección de dependencias manual (sin contenedor IoC)

Los services reciben repositories por constructor:

```typescript
class OrdenesService {
  constructor(
    private ordenRepo: IOrdenRepository,
    private productoRepo: IProductoRepository
  ) {}
}
```

Se instancian en un archivo de composición (`src/composition-root.ts`) que conecta las capas.

**Rationale**: Un contenedor IoC (como tsyringe o inversify) agrega complejidad y dependencias para un proyecto de este tamaño. La inyección manual es explícita, fácil de seguir y suficiente para hacer el código testeable.

### 3. Módulo de dominio para reglas puras

Las funciones `validateStatusTransition` y `updateOrdenTotal` se extraen a `src/domain/`:
- Son funciones puras (input → output, sin side effects)
- No dependen de Mongoose ni de Express
- Son las candidatas ideales para tests unitarios

**Rationale**: Principio de Single Responsibility — las reglas de negocio no deben depender de la infraestructura. Esto permite testearlas sin mockear MongoDB.

### 4. Controllers delgados

Los controllers solo:
1. Extraen datos del request (`req.params`, `req.body`, `req.query`)
2. Llaman al service correspondiente
3. Formatean la respuesta HTTP con `createResponse()`
4. Manejan errores HTTP (404, 400, 403)

**Rationale**: Single Responsibility — el controller no debe saber cómo se calcula un total ni cómo se consulta la base de datos.

### 5. Configuración centralizada con appsettings.json

Se introduce un archivo `appsettings.json` en la raíz del backend que centraliza toda la configuración de la aplicación:

```json
{
  "database": {
    "uri": "mongodb://localhost:27017/mi_tienda_gorditas",
    "options": {
      "serverSelectionTimeoutMS": 30000,
      "socketTimeoutMS": 45000
    }
  },
  "jwt": {
    "secret": "default-dev-secret",
    "expiresIn": "7d",
    "refreshExpiresIn": "30d"
  },
  "server": {
    "port": 5000
  }
}
```

Un módulo `src/config/app-settings.ts` carga este archivo, lo mergea con variables de entorno (las env vars tienen prioridad) y expone un objeto tipado `AppSettings`. El resto de la aplicación importa la configuración desde este módulo en lugar de leer `process.env` directamente.

**Rationale**: 
- Centraliza la configuración en un solo lugar visible y versionable
- Permite tener valores por defecto para desarrollo sin depender de un `.env`
- Las variables de entorno siguen teniendo prioridad (para Docker/producción)
- El tipado TypeScript previene errores de configuración en tiempo de compilación
- Sigue el patrón de configuración de frameworks como .NET Core (`appsettings.json`) que el equipo ya conoce

### 6. Interfaces como contratos

Se definen interfaces para repositories y services en `src/interfaces/`. Esto permite:
- Dependency Inversion: las capas superiores dependen de abstracciones, no de implementaciones
- Sustituir Mongoose por otra fuente de datos sin tocar services
- Mockear repositories en tests futuros

**Rationale**: Principio de Inversión de Dependencias (la D de SOLID).

## Risks / Trade-offs

- **Más archivos, más indirección** → Se mitiga con nombres claros y convención consistente (`*.controller.ts`, `*.service.ts`, `*.repository.ts`)
- **Refactor grande en un solo paso** → Se mitiga dividiendo las tareas por dominio funcional (auth primero, luego ordenes, etc.) y verificando que cada endpoint sigue respondiendo igual
- **Sin tests para validar que no hay regresiones** → Se mitiga con pruebas manuales de los endpoints principales después de cada módulo refactorizado
- **Curva de aprendizaje para el equipo** → Se mitiga con documentación clara en el README del backend sobre la nueva estructura
