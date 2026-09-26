## MODIFIED Requirements

### Requirement: Sales report in the business time zone
`GET /api/reportes/ventas` (Admin, Encargado) SHALL consider orders with status Pagada, filter by `fechaInicio`/`fechaFin` (YYYY-MM-DD interpreted in `APP_TZ`), and return `{ ordenes, productos, platillos, extras, pagination:{total}, resumen:{totalVentas,cantidadOrdenes,promedioVenta}, ventasPorDia:[{_id:'YYYY-MM-DD',ventas,ordenes}], ventasPorTipo:[{_id,ventas,ordenes}], ordenesPagadas }`.

Because the response flattens a nested structure into parallel lists, every line SHALL carry the key that links it back to its order. A dish is stored against its suborden, so flattening SHALL add `idOrden` to it; without that key the caller cannot tell which order a dish belongs to, and the report shows orders as if nothing had been sold in them.

#### Scenario: Day bucketing follows Mexico City
- **WHEN** an order is paid at 03:30 UTC on 2026-09-06 (21:30 of 2026-09-05 in Mexico City)
- **THEN** it appears under `ventasPorDia._id = '2026-09-05'`

#### Scenario: A dish can be traced to its order
- **WHEN** a paid order has a dish recorded under one of its subordenes
- **THEN** that dish appears in `platillos` carrying the `idOrden` of the order it was sold in
