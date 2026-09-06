## Context

El sistema ya tiene multi-tenant con Microsoft Entra auth. Cada tenant tiene un registro en `kustodela_master.tenants`. Stripe está en modo test con claves disponibles. Se necesita cobrar renta mensual con trial de 14 días.

Precios objetivo para el mercado mexicano (fondas, gorditerías, taquerías):
- Básico: $299 MXN/mes (3 usuarios)
- Profesional: $599 MXN/mes (10 usuarios)
- Empresarial: $999 MXN/mes (usuarios ilimitados)

## Goals / Non-Goals

**Goals:**
- Crear productos/precios en Stripe programáticamente (o documentar cómo crearlos manualmente)
- Implementar checkout session para que el usuario ingrese tarjeta
- Trial automático de 14 días sin tarjeta requerida
- Webhooks para activar/desactivar acceso según estado de pago
- Portal de cliente de Stripe para que el usuario gestione su suscripción
- Middleware que verifique que el tenant tiene suscripción activa o trial vigente

**Non-Goals:**
- No se implementa facturación mexicana (CFDI) en esta fase
- No se implementa cobro por transacción (solo suscripción flat)
- No se implementan descuentos o cupones por ahora
- No se cambia el flujo de onboarding completo (solo se agrega el paso de plan)

## Decisions

### 1. Stripe Checkout (no formulario propio)

Usamos Stripe Checkout (redirect) en lugar de un formulario de tarjeta embebido. Stripe se encarga de:
- PCI compliance
- UI de pago responsive
- Métodos de pago (tarjeta, OXXO en México)
- Validación de tarjeta
- 3D Secure

**Rationale**: Cero responsabilidad PCI. Stripe Checkout es plug-and-play y soporta OXXO (importante para México).

### 2. Trial sin tarjeta (14 días)

Al registrarse, el tenant entra en trial automáticamente. No se requiere tarjeta. Al día 13 se puede enviar un email recordatorio. Al día 15, si no ha pagado, el sistema bloquea el acceso (pero no elimina datos).

```
Registro → Trial (14 días) → Seleccionar plan → Checkout → Activo
                            → Expiró sin pagar → Bloqueado (datos intactos)
```

**Rationale**: Reducir fricción al registro. El usuario prueba sin compromiso.

### 3. Webhooks para sincronizar estado

Stripe notifica al backend cuando:
- `checkout.session.completed` → activar suscripción
- `invoice.paid` → renovación exitosa
- `invoice.payment_failed` → marcar como moroso
- `customer.subscription.deleted` → desactivar tenant

El backend actualiza el campo `planStatus` del tenant en la master DB.

### 4. Modelo de datos actualizado

```
Tenant (master DB) - campos nuevos:
{
  stripeCustomerId: "cus_...",
  stripeSubscriptionId: "sub_...",
  plan: "basico" | "profesional" | "empresarial" | "trial",
  planStatus: "trial" | "active" | "past_due" | "canceled" | "expired",
  trialEndsAt: Date,
  maxUsuarios: 3 | 10 | 999,
}
```

### 5. Middleware de verificación de plan

Antes de procesar requests del POS, se verifica que el tenant tenga acceso:
- `planStatus === 'active'` → OK
- `planStatus === 'trial' && trialEndsAt > now` → OK
- Cualquier otro → 403 "Suscripción inactiva"

## Risks / Trade-offs

- **Trial sin tarjeta** → Posible abuso (crear cuentas infinitas). Mitigation: limitar 1 trial por email.
- **Webhooks no llegan en desarrollo local** → Usar Stripe CLI (`stripe listen --forward-to localhost:5000/api/billing/webhook`) para testing local.
- **Latencia de webhooks** → El estado puede tardar segundos en actualizarse. Mitigation: el checkout redirect incluye verificación directa.
