## Context

El frontend es una SPA React 18 + TypeScript + Vite + Tailwind CSS. Tiene 11 páginas, un servicio API monolítico, un AuthContext, y componentes de layout. Las páginas son archivos enormes que hacen todo: fetch, lógica, estado y UI. No hay custom hooks ni componentes reutilizables más allá del layout.

## Goals / Non-Goals

**Goals:**
- Separar la capa de servicios API por dominio funcional
- Extraer lógica de datos y negocio a custom hooks reutilizables
- Crear componentes UI base reutilizables para eliminar duplicación
- Descomponer páginas monolíticas en sub-componentes enfocados
- Eliminar `any` de los servicios y hooks
- Centralizar la configuración del API (URL base)

**Non-Goals:**
- No se agrega una librería de estado global (Redux, Zustand) — se mantiene Context + hooks
- No se cambia el framework (se mantiene React + Vite)
- No se cambia la librería de estilos (se mantiene Tailwind)
- No se agregan tests en este cambio (se deja la estructura lista)
- No se cambia la UX ni el diseño visual
- No se refactorizan las 11 páginas completas — se hace por fases empezando por la infraestructura

## Decisions

### 1. Estructura por features (no por tipo)

```
src/
├── components/
│   ├── ui/               # Componentes UI reutilizables
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── FormInput.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   └── index.ts
│   ├── layout/           # Layout, Header, Sidebar (ya existe)
│   └── ProtectedRoute.tsx
├── services/             # Servicios API por dominio
│   ├── api-client.ts     # Cliente HTTP base (fetch wrapper)
│   ├── auth.service.ts
│   ├── ordenes.service.ts
│   ├── inventario.service.ts
│   ├── catalogos.service.ts
│   ├── reportes.service.ts
│   └── index.ts
├── hooks/                # Custom hooks compartidos
│   ├── useApi.ts         # Hook genérico para llamadas API
│   ├── usePolling.ts     # Hook para polling periódico
│   ├── useCatalogos.ts   # Hook para cargar catálogos
│   ├── useOrdenes.ts     # Hook para operaciones de órdenes
│   └── index.ts
├── config/               # Configuración del frontend
│   └── app-config.ts     # URL del API, timeouts, etc.
├── context/              # Contexts (AuthContext ya existe)
├── types/                # Tipos por dominio
│   ├── auth.types.ts
│   ├── orden.types.ts
│   ├── catalogo.types.ts
│   ├── inventario.types.ts
│   ├── reportes.types.ts
│   ├── ui.types.ts
│   └── index.ts          # Re-exports
├── pages/                # Páginas (se simplifican progresivamente)
└── App.tsx
```

**Rationale**: Organizar por feature/dominio escala mejor que por tipo. Cada dominio tiene sus servicios, hooks y tipos agrupados. Los componentes UI son transversales.

### 2. Cliente HTTP base (`api-client.ts`)

Un wrapper de `fetch` que centraliza:
- URL base desde configuración
- Headers de autenticación (token de localStorage)
- Manejo de errores consistente
- Tipado genérico de respuestas

```typescript
class ApiClient {
  async get<T>(endpoint: string): Promise<ApiResponse<T>> { ... }
  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> { ... }
  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> { ... }
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> { ... }
}
export const apiClient = new ApiClient();
```

Los servicios por dominio usan `apiClient` internamente.

**Rationale**: Elimina la duplicación del manejo de headers/errores. Los servicios de dominio solo se preocupan por los endpoints específicos.

### 3. Servicios por dominio

Cada servicio es un objeto con métodos tipados:

```typescript
// services/ordenes.service.ts
export const ordenesService = {
  list: (params) => apiClient.get<OrdenesResponse>('/ordenes', { params }),
  getById: (id) => apiClient.get<OrdenCompleta>(`/ordenes/${id}`),
  create: (data: CreateOrdenDTO) => apiClient.post<Orden>('/ordenes/nueva', data),
  // ...
};
```

**Rationale**: Objetos simples en lugar de clases — más idiomático en React, más fácil de mockear, sin necesidad de instanciación.

### 4. Custom hooks para lógica de datos

```typescript
// hooks/useOrdenes.ts
export function useOrdenes(options?: { polling?: boolean }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ... fetch logic, polling, refresh
  return { ordenes, loading, error, refresh };
}
```

**Rationale**: Encapsula el patrón repetido de fetch + loading + error + polling. Las páginas solo consumen el hook y renderizan.

### 5. Configuración centralizada del frontend

```typescript
// config/app-config.ts
export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  pollingInterval: 8000,
  tokenKey: 'token',
};
```

**Rationale**: Elimina URLs hardcodeadas y magic numbers dispersos en el código.

### 6. Estrategia de migración incremental

Se refactoriza en fases para no romper todo de golpe:
1. **Fase 1**: Infraestructura (config, api-client, servicios, hooks base, componentes UI)
2. **Fase 2**: Migrar páginas una por una para usar los nuevos servicios/hooks

Este cambio cubre solo la Fase 1 (infraestructura). La Fase 2 se puede hacer progresivamente después.

## Risks / Trade-offs

- **Refactor grande** → Se mitiga haciendo solo la infraestructura primero, sin tocar las páginas existentes. Las páginas pueden migrar gradualmente.
- **Dos formas de hacer lo mismo temporalmente** → Durante la migración, `api.ts` viejo coexiste con los servicios nuevos. Se elimina cuando todas las páginas migren.
- **Sin tests para validar** → Se mitiga verificando manualmente que la app sigue funcionando después de cada fase.
