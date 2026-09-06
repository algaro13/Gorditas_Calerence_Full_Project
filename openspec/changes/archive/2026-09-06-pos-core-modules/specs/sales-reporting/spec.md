## ADDED Requirements

### Requirement: Sales report in the business time zone
`GET /api/reportes/ventas` (Admin, Encargado) SHALL consider orders with status Pagada, filter by `fechaInicio`/`fechaFin` (YYYY-MM-DD interpreted in `APP_TZ`), and return `{ ordenes, productos, platillos, extras, pagination:{total}, resumen:{totalVentas,cantidadOrdenes,promedioVenta}, ventasPorDia:[{_id:'YYYY-MM-DD',ventas,ordenes}], ventasPorTipo:[{_id,ventas,ordenes}], ordenesPagadas }`.

#### Scenario: Day bucketing follows Mexico City
- **WHEN** an order is paid at 03:30 UTC on 2026-09-06 (21:30 of 2026-09-05 in Mexico City)
- **THEN** it appears under `ventasPorDia._id = '2026-09-05'`

### Requirement: Inventory, expenses and best sellers
The system SHALL expose `GET /api/reportes/inventario` (`productos`, `resumen` with `valorInventario`, `alertas.stockBajo/stockAlto`), `GET|POST /api/reportes/gastos` and `DELETE /api/reportes/gastos/:id` (`gastos`, `resumen`, `gastosPorTipo`, `gastosPorDia`), and `GET /api/reportes/productos-vendidos` returning `productos[]`/`platillos[]` as `{ _id:{idX,nombreX}, cantidadVendida, totalVentas, vecesVendido }` counting orders in status Entregada or Pagada.

#### Scenario: Expense creation resolves the type name
- **WHEN** an Encargado posts a gasto with `idTipoGasto`
- **THEN** the response includes `nombreTipoGasto` and the gasto appears in `gastosPorTipo`

#### Scenario: Best sellers include paid orders
- **WHEN** a producto was sold in one Pagada order and one Entregada order
- **THEN** `cantidadVendida` sums both
