## MODIFIED Requirements

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
