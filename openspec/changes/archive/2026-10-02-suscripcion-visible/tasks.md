## 1. Backend

- [x] 1.1 Migración `0007_periodo_suscripcion`: `current_period_end` y `cancel_at` en `tenants`
- [x] 1.2 `SubscriptionSnapshot` trae `currentPeriodEnd` y `cancelAt`, desde Stripe y el fake
- [x] 1.3 El webhook guarda las fechas; `customer.subscription.deleted` limpia la cancelación programada
- [x] 1.4 `GET /api/billing/status` añade `currentPeriodEnd`, `cancelAt`, `usuariosActivos` y `tieneClienteStripe`
- [x] 1.5 El portal vuelve a `/suscripcion`
- [x] 1.6 Pruebas e2e de billing cubren lo anterior

## 2. Frontend

- [x] 2.1 Entrada «Suscripción» en el menú, solo Admin, con su icono en la barra lateral y en «Más»
- [x] 2.2 Página `/suscripcion` dentro del layout, protegida para Admin
- [x] 2.3 Aviso del panel: `past_due` en rojo y cancelación programada
- [x] 2.4 `/planes` con plan y estado traducidos, nombres en un solo sitio

## 3. Verificación

- [x] 3.1 Navegador: Admin ve la entrada y la pantalla. Para los demás roles se usa el mismo
  `hasPermission` y `ProtectedRoute` que el resto del menú; no se probó con un Mesero real porque el
  restaurante de pruebas solo tiene credenciales de Admin
- [x] 3.2 Navegador: estados trial, active, past_due y cancelación programada se ven bien
- [x] 3.3 Suites del backend y e2e del navegador en verde

## 4. Cierre

- [x] 4.1 Commit y `openspec archive`
