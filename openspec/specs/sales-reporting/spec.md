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

### Requirement: The cash box belongs to the restaurant
The amount of cash recorded for a day SHALL be stored server-side against the restaurant and that day, under the same tenant isolation as the rest of the data, and SHALL NOT be kept in the browser.

The system SHALL expose reading the amounts of a period and setting the amount of a day, to the same roles that may read the report. The day SHALL be a date without a time, in the restaurant's day.

Amounts previously recorded in a browser SHALL be uploaded once, only for days the server does not already know, and the local copy SHALL be kept rather than destroyed.

#### Scenario: Two devices, one till
- **WHEN** an Encargado records the cash box on a phone and a second person opens the report on another device
- **THEN** both see the same amount and the same resulting profit

#### Scenario: Two restaurants in one browser
- **WHEN** two restaurants are used from the same browser
- **THEN** neither one's cash box appears in the other's report

#### Scenario: A browser that had amounts recorded
- **WHEN** the report is opened in a browser holding amounts recorded before, for days the server does not know
- **THEN** those amounts are uploaded once and appear in the report from any device afterwards

### Requirement: A day with movement appears in the summary
The daily summary SHALL list every day of the period that had movement —sales, cash recorded, or expenses— and not only the days that had sales.

The totals of the period SHALL be the sum of what those days show, so that money spent on a day without sales is subtracted from the profit rather than ignored.

A day with no orders SHALL NOT offer to open its orders.

#### Scenario: Money spent on a day that did not open
- **WHEN** an expense is recorded on a day with no sales, inside the period being shown
- **THEN** that day appears in the summary with its expense, and the period's profit is lower by that amount

#### Scenario: Cash recorded on a quiet day
- **WHEN** cash is recorded for a day with no sales
- **THEN** that day appears in the summary with its amount, and the period's cash total includes it

The figures shown SHALL correspond to the period the filter states: an answer that arrives after a different period was asked for SHALL be discarded rather than displayed.

#### Scenario: Changing both ends of the period quickly
- **WHEN** the start and end dates are changed one after the other
- **THEN** the figures shown are those of the period the fields state, not those of a request made halfway through the change

#### Scenario: A period with expenses and no sales at all
- **WHEN** the period has no sales but does have expenses
- **THEN** the expenses are still fetched and shown, instead of an empty report

