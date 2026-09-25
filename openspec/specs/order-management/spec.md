# order-management Specification

## Purpose
TBD - created by archiving change pos-core-modules. Update Purpose after archive.
## Requirements
### Requirement: Order tree with server-side pricing
The system SHALL create orders with a per-tenant folio `ORD-YYMMDD-NNNN`, allow subórdenes per order, platillos (with guiso) per suborden, extras per platillo line and productos per order; names and prices of every line SHALL be taken from the tenant catalog at insertion time.

The order type SHALL be optional on creation. When it is omitted the system SHALL use the tenant's own default — the first active entry of its order-type catalog — rather than rejecting the request. A client SHALL NOT need to know catalog identifiers for a value the user is never asked to choose: catalog ids are generated per tenant, so any identifier a client assumes is correct for at most one restaurant.

When an order type is supplied it SHALL still be validated against the tenant's catalog, so that an identifier belonging to another restaurant is rejected.

A tenant with no active order type SHALL be told that its order-type catalog is empty, not that the type is invalid, because the two failures call for different fixes.

#### Scenario: Create order and add lines
- **WHEN** an authenticated Mesero posts `/api/ordenes/nueva` with `idTipoOrden` and `idMesa`, then adds a suborden, a platillo with guiso, an extra on that platillo and a producto
- **THEN** each response returns the created row with `_id`, the order `total` equals the sum of all line `importe` values, and the line prices match the catalog even if the client sent different amounts

#### Scenario: Order created without naming a type
- **WHEN** an order is posted without `idTipoOrden`
- **THEN** it is created using the tenant's first active order type, whatever identifier that happens to have

#### Scenario: Order type belonging to another restaurant
- **WHEN** an order is posted with an `idTipoOrden` that exists but belongs to a different tenant
- **THEN** the request is rejected and no order is created

#### Scenario: Tenant without order types
- **WHEN** an order is posted without a type by a tenant whose order-type catalog has no active entry
- **THEN** the error says the catalog is empty rather than that the type is invalid

#### Scenario: Product with insufficient stock
- **WHEN** a producto is added with `cantidad` greater than its stock
- **THEN** the API responds 400 "Producto no disponible o stock insuficiente" and no line is created

#### Scenario: Stock decrement is atomic
- **WHEN** two requests add the last unit of the same producto concurrently
- **THEN** exactly one succeeds and the stock never goes negative

### Requirement: Order retrieval keeps the legacy shape
`GET /api/ordenes/:id` SHALL return the order with `subordenes`, `productos`, `platillos` (each with `idSuborden` and nested `extras`) and a flat `extras` array; `GET /api/ordenes` SHALL support `estatus`, `estatusNo` (comma list), `mesa`, `fecha`, `page`, `limit` and return `{ ordenes, pagination }`.

#### Scenario: Active orders listing
- **WHEN** the client requests `/api/ordenes?limit=1000&estatusNo=Pagada,Cancelado`
- **THEN** only orders whose status is not Pagada nor Cancelado are returned, newest first

### Requirement: Status transitions by role
The system SHALL validate `PUT /api/ordenes/:id/estatus` with the role table (Admin: any; Encargado/Mesero: Pendiente→Recepcion, Recepcion→Preparacion|Surtida|Entregada, Preparacion→Surtida|Recepcion, Surtida→Entregada|Pagada|Recepcion, Entregada→Pagada|Recepcion; Despachador: Recepcion→Preparacion|Surtida|Entregada, Preparacion→Surtida, Surtida→Entregada; Cocinero: Recepcion→Preparacion|Surtida|Entregada, Preparacion→Surtida). A user with several roles is allowed if any role allows it.

#### Scenario: Forbidden transition
- **WHEN** a Cocinero tries Surtida → Pagada
- **THEN** the API responds 403 "Transición de estatus no permitida para su rol"

#### Scenario: Paying stamps fechaPago; Surtida marks everything ready
- **WHEN** an order goes to Pagada
- **THEN** `fechaPago` is set
- **WHEN** an order goes to Surtida
- **THEN** every producto, platillo and extra line of that order has `listo = true`

### Requirement: Line flags, notes, deletion and cascade
The system SHALL provide `PUT /api/ordenes/{producto|platillo|extra}/:id/{listo|entregado}`, `PUT /api/ordenes/extra/:id/estatus`, `PUT /api/ordenes/platillo/:id/nota`, `DELETE /api/ordenes/{platillo|producto|extra}/:id` (recalculating the total) and `DELETE /api/ordenes/:id` (removing the whole tree).

#### Scenario: Deleting an order removes its lines
- **WHEN** an order with subórdenes, platillos, extras and productos is deleted
- **THEN** no rows of that order remain in any detail table

#### Scenario: Verification of pending orders
- **WHEN** a Mesero calls `PUT /api/ordenes/:id/verificar` with `isComplete: true` on a Pendiente order
- **THEN** the order becomes Recepcion; on a non-pending order the API responds 400

