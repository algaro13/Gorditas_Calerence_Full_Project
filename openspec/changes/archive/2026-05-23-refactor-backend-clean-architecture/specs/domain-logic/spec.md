## ADDED Requirements

### Requirement: Order status transitions are validated by a pure domain function
The system SHALL validate order status transitions using a pure function in `src/domain/orden-status.ts` that receives the current status, target status, and user role, and returns whether the transition is allowed.

#### Scenario: Valid transition for role
- **WHEN** `validateStatusTransition("Recepcion", "Preparacion", "Despachador")` is called
- **THEN** the function returns `true`

#### Scenario: Invalid transition for role
- **WHEN** `validateStatusTransition("Pagada", "Recepcion", "Cocinero")` is called
- **THEN** the function returns `false`

#### Scenario: Admin bypasses restrictions
- **WHEN** `validateStatusTransition` is called with role "Admin"
- **THEN** the function returns `true` for any status combination

#### Scenario: Function has no external dependencies
- **WHEN** the domain module is imported
- **THEN** it does not import Mongoose, Express, or any I/O library

### Requirement: Order total calculation is a pure domain function
The system SHALL calculate order totals using a pure function in `src/domain/orden-calculator.ts` that receives arrays of product, platillo, and extra amounts and returns the computed total.

#### Scenario: Calculate total from all item types
- **WHEN** `calculateOrdenTotal` receives product importes [50, 30], platillo importes [100, 80], and extra importes [15, 10]
- **THEN** it returns 285

#### Scenario: Calculate total with empty arrays
- **WHEN** `calculateOrdenTotal` receives empty arrays for all item types
- **THEN** it returns 0

#### Scenario: Function is testable without database
- **WHEN** `calculateOrdenTotal` is called
- **THEN** it operates on plain numbers without requiring database queries

### Requirement: Inventory validation is a pure domain function
The system SHALL validate inventory availability using a pure function that receives current stock and requested quantity, and returns whether the operation is allowed.

#### Scenario: Sufficient stock
- **WHEN** `validateInventoryAvailability(currentStock: 10, requestedQuantity: 5)` is called
- **THEN** it returns `{ available: true }`

#### Scenario: Insufficient stock
- **WHEN** `validateInventoryAvailability(currentStock: 3, requestedQuantity: 5)` is called
- **THEN** it returns `{ available: false, reason: "Stock insuficiente" }`
