# sales-reporting Specification

## Purpose
TBD - created by archiving change pos-core-modules. Update Purpose after archive.
## Requirements
### Requirement: Sales report in the business time zone
`GET /api/reportes/ventas` (Admin, Encargado) SHALL consider orders with status Pagada, filter by `fechaInicio`/`fechaFin` (YYYY-MM-DD interpreted in `APP_TZ`), and return `{ ordenes, productos, platillos, extras, pagination:{total}, resumen:{totalVentas,cantidadOrdenes,promedioVenta}, ventasPorDia:[{_id:'YYYY-MM-DD',ventas,ordenes}], ventasPorTipo:[{_id,ventas,ordenes}], ordenesPagadas }`.

Because the response flattens a nested structure into parallel lists, every line SHALL carry the key that links it back to its order. A dish is stored against its suborden, so flattening SHALL add `idOrden` to it; without that key the caller cannot tell which order a dish belongs to, and the report shows orders as if nothing had been sold in them.

#### Scenario: Day bucketing follows Mexico City
- **WHEN** an order is paid at 03:30 UTC on 2026-09-06 (21:30 of 2026-09-05 in Mexico City)
- **THEN** it appears under `ventasPorDia._id = '2026-09-05'`

#### Scenario: A dish can be traced to its order
- **WHEN** a paid order has a dish recorded under one of its subordenes
- **THEN** that dish appears in `platillos` carrying the `idOrden` of the order it was sold in

### Requirement: Inventory, expenses and best sellers
The system SHALL expose `GET /api/reportes/inventario` (`productos`, `resumen` with `valorInventario`, `alertas.stockBajo/stockAlto`), `GET|POST /api/reportes/gastos` and `DELETE /api/reportes/gastos/:id` (`gastos`, `resumen`, `gastosPorTipo`, `gastosPorDia`), and `GET /api/reportes/productos-vendidos` returning `productos[]`/`platillos[]` as `{ _id:{idX,nombreX}, cantidadVendida, totalVentas, vecesVendido }` counting orders in status Entregada or Pagada.

#### Scenario: Expense creation resolves the type name
- **WHEN** an Encargado posts a gasto with `idTipoGasto`
- **THEN** the response includes `nombreTipoGasto` and the gasto appears in `gastosPorTipo`

#### Scenario: Best sellers include paid orders
- **WHEN** a producto was sold in one Pagada order and one Entregada order
- **THEN** `cantidadVendida` sums both

### Requirement: Today means the restaurant's today
The day a report opens on SHALL be the current day in the restaurant's time zone, and SHALL NOT be derived from UTC.

`GET /api/tenants/me` SHALL state that time zone so the SPA and the API agree on which day is being asked for. Where no time zone is known the SPA SHALL fall back to the browser's own zone, never to UTC.

The same day SHALL be used wherever the screen records something against today, such as the cash box amount, so that money entered in the evening is not filed under tomorrow.

#### Scenario: Opening the report during dinner service
- **WHEN** an Encargado opens the sales report at 18:04 in Mexico City, which is 00:04 UTC of the next day
- **THEN** the report opens on the current Mexico City day and shows that day's sales

#### Scenario: Recording cash in the evening
- **WHEN** cash is added to the box at 20:00 local time
- **THEN** it is recorded against the current local day, not the next one

