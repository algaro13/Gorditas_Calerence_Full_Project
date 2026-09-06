# inventory-management Specification

## Purpose
TBD - created by archiving change pos-core-modules. Update Purpose after archive.
## Requirements
### Requirement: Stock query with alerts
`GET /api/inventario` SHALL return `{ productos, pagination, resumen }` where each producto carries `stockBajo` (cantidad ≤ 5) and `stockAgotado` (cantidad = 0), with `tipoProducto` and `activo` filters.

#### Scenario: Low stock flags
- **WHEN** a producto has 3 units and another has 0
- **THEN** the first has `stockBajo = true`, the second `stockAgotado = true`, and `resumen` counts them

### Requirement: Receiving and adjusting stock
`POST /api/inventario/recibir` (Admin, Encargado) SHALL increment stock for each `{ idProducto, cantidad > 0 }` in one transaction and return the updated rows; `PUT /api/inventario/ajustar/:id` SHALL set the absolute quantity and reject negatives with 400.

#### Scenario: Batch receipt
- **WHEN** an Encargado receives `[{ idProducto: A, cantidad: 5 }, { idProducto: B, cantidad: 0 }]`
- **THEN** A increases by 5, B is skipped and the message reports 1 producto actualizado

#### Scenario: Mesero cannot receive stock
- **WHEN** a Mesero calls `/api/inventario/recibir`
- **THEN** the API responds 403

