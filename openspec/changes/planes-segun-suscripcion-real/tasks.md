## 1. Implementación

- [x] 1.1 `GET /api/billing/status` añade `suscripcionViva` con la misma regla del checkout y el cambio
- [x] 1.2 `/planes` decide con `suscripcionViva`; sin dato todavía, no ofrece nada
- [x] 1.3 `YA_SUSCRITO` se explica en la pantalla
- [x] 1.4 «Gestionar suscripción» solo con cliente en Stripe
- [x] 1.5 Pruebas (backend y navegador)

## 2. Verificación

- [x] 2.1 Local: plan activo sin suscripción → «Seleccionar»; con suscripción → «Cambiar a este plan»
- [x] 2.2 Suites en verde
- [ ] 2.3 VPS: desplegar y comprobar `taqueria-lupita`

## 3. Cierre

- [ ] 3.1 Commit y `openspec archive`
