# catalog-management Specification

## Purpose
TBD - created by archiving change pos-core-modules. Update Purpose after archive.
## Requirements
### Requirement: Generic catalog CRUD
The system SHALL expose `GET|POST /api/catalogos/:modelo` and `PUT|DELETE /api/catalogos/:modelo/:id` for `guiso`, `tipoproducto`, `producto`, `tipoplatillo`, `platillo`, `tipoextra`, `extra`, `tipoorden`, `mesa`, `tipogasto`, `gasto` (and hyphenated aliases), with `page`, `limit`, `activo` and `search` filters, sorted by `nombre`, returning `{ items, pagination }` and rows with `_id` and flattened type names (`nombreTipoProducto`, `nombreTipoPlatillo`, `nombreTipoGasto`).

#### Scenario: Create and list a producto
- **WHEN** a producto is created with `idTipoProducto`, `nombre`, `cantidad`, `costo`, `variantes`
- **THEN** listing `producto` returns it with numeric `_id`, `nombreTipoProducto` and `variantes` as an array

#### Scenario: Unknown model
- **WHEN** the client requests `/api/catalogos/inexistente`
- **THEN** the API responds 400 "Modelo no válido"

#### Scenario: Deleting a referenced record
- **WHEN** a platillo referenced by an order line is deleted
- **THEN** the API responds 409 and the record remains

### Requirement: Fixed role list and daily order number
`GET /api/catalogos/tipousuario` SHALL return the five roles as `{ _id, nombre }`; `GET /api/catalogos/pedido/next-number` SHALL return `{ nextNumber }` from the tenant's daily counter.

#### Scenario: Daily counter per tenant
- **WHEN** two tenants each request the next pedido number for the first time today
- **THEN** both receive 1

