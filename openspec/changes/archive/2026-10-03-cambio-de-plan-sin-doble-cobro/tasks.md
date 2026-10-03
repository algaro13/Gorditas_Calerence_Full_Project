## 1. Backend

- [x] 1.1 `create-checkout` → 409 `YA_SUSCRITO` con suscripción viva
- [x] 1.2 `PaymentProvider.changeSubscriptionPrice` (Stripe con prorrateo inmediato, y el fake)
- [x] 1.3 Caso de uso `CambiarPlan` y `POST /api/billing/change-plan` (Admin)
- [x] 1.4 Correo del cliente desde el miembro guardado cuando el token no lo trae
- [x] 1.5 Portal con `locale: es-419`
- [x] 1.6 Pruebas e2e del backend

## 2. Frontend

- [x] 2.1 `/planes` con suscripción viva: «Tu plan actual» y «Cambiar a este plan» con confirmación
- [x] 2.2 Prueba de navegador del cambio de plan

## 3. Verificación

- [x] 3.1 Stripe modo test: Básico → Profesional deja una sola suscripción
- [x] 3.2 Cliente nuevo con correo (prueba e2e del backend: el cliente de demo ya existía en Stripe);
  portal en español verificado en Stripe modo test
- [x] 3.3 Suites en verde

## 4. Cierre

- [x] 4.1 Commit y `openspec archive`
