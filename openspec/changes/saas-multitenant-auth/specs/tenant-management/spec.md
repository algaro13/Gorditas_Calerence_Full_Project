## ADDED Requirements

### Requirement: Master Database stores tenant registry
The system SHALL maintain a Master Database (`kustodela_master`) with collections for tenants, tenant users, and plans.

#### Scenario: Tenant document structure
- **WHEN** a tenant is created
- **THEN** it is stored with: `slug`, `nombre`, `dbName`, `plan`, `activo`, `createdAt`, `config` (logo, paleta)

#### Scenario: Tenant user document structure
- **WHEN** a user is assigned to a tenant
- **THEN** it is stored with: `entraOid`, `tenantId`, `email`, `nombre`, `role`, `sucursalId`, `activo`

### Requirement: Tenant resolved by subdomain
The system SHALL resolve the active tenant from the request's origin subdomain using the pattern `pos-{slug}.kustodela.com`.

#### Scenario: Valid subdomain resolves tenant
- **WHEN** a request originates from `pos-gorditas-calerence.kustodela.com`
- **THEN** the middleware extracts slug `gorditas-calerence`, finds the tenant in master DB, and connects to its database

#### Scenario: Unknown subdomain rejected
- **WHEN** a request originates from a subdomain with no matching tenant in the master DB
- **THEN** the API responds with HTTP 404 "Tenant no encontrado"

#### Scenario: Inactive tenant rejected
- **WHEN** a request resolves to a tenant with `activo: false`
- **THEN** the API responds with HTTP 403 "Cuenta suspendida"

### Requirement: Database-per-tenant isolation
The system SHALL create a separate MongoDB database for each tenant, named with convention `pos_{slug_with_underscores}`.

#### Scenario: Tenant database contains full schema
- **WHEN** a new tenant database is provisioned
- **THEN** it contains all collections needed for the POS system (ordenes, productos, platillos, usuarios, etc.) with proper indexes

#### Scenario: Tenants cannot access each other's data
- **WHEN** the API processes a request for tenant A
- **THEN** it only queries tenant A's database and never accesses tenant B's data

### Requirement: Tenant resolution is cached
The system SHALL cache tenant slug-to-database mappings to avoid querying the master DB on every request.

#### Scenario: Cache hit
- **WHEN** the same subdomain makes multiple requests within a short period
- **THEN** the tenant is resolved from cache without querying the master DB

#### Scenario: Cache invalidation
- **WHEN** a tenant's configuration changes (deactivation, plan change)
- **THEN** the cache entry is invalidated within 5 minutes
