## ADDED Requirements

### Requirement: Controller layer handles HTTP concerns only
The system SHALL have a controller layer that exclusively handles HTTP request parsing, response formatting, and HTTP status code selection. Controllers MUST NOT contain database queries or business logic.

#### Scenario: Controller delegates to service
- **WHEN** an HTTP request arrives at any API endpoint
- **THEN** the controller extracts parameters from the request, calls the corresponding service method, and returns the service result formatted as an HTTP response

#### Scenario: Controller handles not-found from service
- **WHEN** a service method returns null or throws a not-found error
- **THEN** the controller responds with HTTP 404 and an appropriate error message

#### Scenario: Controller handles validation errors
- **WHEN** a service method throws a validation/business error
- **THEN** the controller responds with HTTP 400 and the error message

### Requirement: Service layer encapsulates business logic
The system SHALL have a service layer that contains all business logic and orchestration. Services MUST receive repositories via constructor injection and MUST NOT import Express types or Mongoose models directly.

#### Scenario: Service orchestrates multiple repositories
- **WHEN** a business operation requires data from multiple collections (e.g., creating an order detail that affects inventory)
- **THEN** the service coordinates calls to the relevant repositories and applies business rules

#### Scenario: Service is independent of HTTP framework
- **WHEN** a service method is invoked
- **THEN** it operates without any reference to `Request`, `Response`, or Express middleware

### Requirement: Repository layer abstracts data access
The system SHALL have a repository layer that encapsulates all Mongoose queries. Each repository MUST implement a TypeScript interface defined in `src/interfaces/`.

#### Scenario: Repository provides CRUD operations
- **WHEN** a service needs to read or write data
- **THEN** it calls repository methods that abstract the underlying Mongoose operations

#### Scenario: Repository is substitutable
- **WHEN** a different data source is needed (e.g., for testing)
- **THEN** a new implementation of the repository interface can be provided without changing the service layer

### Requirement: Interfaces define contracts between layers
The system SHALL define TypeScript interfaces for all repository and service contracts in `src/interfaces/`. Upper layers MUST depend on these interfaces, not on concrete implementations.

#### Scenario: Service depends on repository interface
- **WHEN** a service class is defined
- **THEN** its constructor accepts repository interfaces, not concrete Mongoose-based classes

#### Scenario: Composition root wires implementations
- **WHEN** the application starts
- **THEN** a composition root file (`src/composition-root.ts`) instantiates concrete repositories and injects them into services

### Requirement: Routes file only defines routing
The system SHALL keep route files (`src/routes/`) as thin wrappers that only map HTTP methods and paths to controller methods and apply middleware (auth, validation).

#### Scenario: Route file structure
- **WHEN** a route file is read
- **THEN** it contains only `router.get/post/put/delete` calls with middleware and controller method references, with no inline business logic
