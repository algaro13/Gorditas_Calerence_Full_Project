## ADDED Requirements

### Requirement: Single PostgreSQL database with tenant_id on every business table
The system SHALL store all tenants in one PostgreSQL database `kustodela`; every business table SHALL have a `tenant_id uuid NOT NULL DEFAULT current_tenant_id()` column, composite foreign keys `(tenant_id, x_id)` and indexes with `tenant_id` first.

#### Scenario: Application never writes tenant_id
- **WHEN** a row is inserted inside a tenant transaction without specifying `tenant_id`
- **THEN** the row gets the `tenant_id` of the current context

#### Scenario: Cross-tenant reference rejected by the database
- **WHEN** a row in tenant A references by id a parent row that belongs to tenant B
- **THEN** PostgreSQL rejects the insert with a foreign key violation

### Requirement: Row Level Security enforced for every tenant table
The system SHALL enable and force Row Level Security on every table with `tenant_id`, with policy `tenant_id = current_tenant_id()` for USING and WITH CHECK, and the runtime role `pos_app` SHALL NOT have BYPASSRLS.

#### Scenario: Query without tenant context returns nothing
- **WHEN** `SELECT * FROM ordenes` runs on a connection where `app.tenant_id` is not set
- **THEN** zero rows are returned

#### Scenario: Insert without tenant context fails
- **WHEN** an insert runs without `app.tenant_id`
- **THEN** the database rejects it (NOT NULL or policy violation)

#### Scenario: Update of another tenant's row affects nothing
- **WHEN** tenant A runs `UPDATE productos SET cantidad = 0 WHERE id = <id of tenant B>`
- **THEN** zero rows are affected

### Requirement: Tenant context per request
The system SHALL establish the tenant context once per request from the authenticated principal, propagate it with `AsyncLocalStorage`, and execute all database work of the request inside a transaction that sets `app.tenant_id` locally.

#### Scenario: Concurrent requests from two tenants
- **WHEN** 40 requests from tenants A and B are executed concurrently and interleaved
- **THEN** every response contains only rows of the requesting tenant

#### Scenario: Context does not leak between pooled connections
- **WHEN** a tenant transaction commits and the same pooled connection serves a query without context
- **THEN** that query returns zero tenant rows

#### Scenario: Use case invoked without context
- **WHEN** `UnitOfWork.run` is called outside a tenant context
- **THEN** it throws `No tenant context` and the HTTP layer responds 500 with an alert log

### Requirement: Per-tenant counters
The system SHALL generate order folios `ORD-YYMMDD-NNNN` and daily pedido numbers from a `counters` table keyed by `(tenant_id, key)` using an atomic upsert.

#### Scenario: Independent sequences
- **WHEN** tenants A and B each create their first order of the day
- **THEN** both receive sequence 0001
