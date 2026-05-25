## ADDED Requirements

### Requirement: Centralized API client with typed responses
The system SHALL provide a base API client (`api-client.ts`) that handles HTTP requests with automatic token injection, error handling, and typed generic responses.

#### Scenario: Authenticated request
- **WHEN** any service method makes an API call
- **THEN** the api-client automatically includes the Bearer token from localStorage in the Authorization header

#### Scenario: Typed error response
- **WHEN** the backend returns a non-success response
- **THEN** the api-client returns a typed `ApiResponse` with `success: false` and the error message

#### Scenario: Configuration from app-config
- **WHEN** the api-client constructs a request URL
- **THEN** it uses the base URL from `app-config.ts` (which reads from `VITE_API_URL` env var with localhost fallback)

### Requirement: Domain-specific service modules
The system SHALL split API calls into domain-specific service modules: `auth.service.ts`, `ordenes.service.ts`, `inventario.service.ts`, `catalogos.service.ts`, `reportes.service.ts`.

#### Scenario: Service uses api-client
- **WHEN** a service method is called (e.g., `ordenesService.list()`)
- **THEN** it delegates to the api-client with the correct endpoint and typed response

#### Scenario: No business logic in services
- **WHEN** a service module is inspected
- **THEN** it contains only API call definitions with proper TypeScript types, no business logic or state management

#### Scenario: Services are importable independently
- **WHEN** a component needs only catalog operations
- **THEN** it can import `catalogosService` without pulling in ordenes, reportes, or other domains

### Requirement: Strong typing eliminates any
The system SHALL define typed DTOs for all service method parameters and return types, eliminating the use of `any` in the service layer.

#### Scenario: Create orden with typed DTO
- **WHEN** `ordenesService.create()` is called
- **THEN** it accepts a `CreateOrdenDTO` type (not `any`) and returns `ApiResponse<Orden>`

#### Scenario: Catalog operations are generic
- **WHEN** `catalogosService.list<Platillo>('platillo')` is called
- **THEN** it returns `ApiResponse<PaginatedResult<Platillo>>` with full type safety
