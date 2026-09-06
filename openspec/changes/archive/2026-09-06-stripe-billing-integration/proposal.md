## Why

El sistema ya tiene autenticación con Microsoft Entra y arquitectura multi-tenant. Para monetizar el SaaS con renta mensual, periodo de prueba y control de acceso por plan, se necesita integrar Stripe Billing para gestionar suscripciones, cobros recurrentes y trials automáticos.

## What Changes

- Crear productos y planes en Stripe (Básico $299 MXN, Profesional $599 MXN, Empresarial $999 MXN)
- Implementar Stripe Checkout para que los clientes ingresen su forma de pago
- Configurar trial de 14 días automático al registrar un nuevo tenant
- Implementar webhooks de Stripe para activar/desactivar tenants según estado de pago
- Agregar lógica de límites por plan (máximo de usuarios activos)
- Crear página de selección de plan y gestión de suscripción

## Capabilities

### New Capabilities
- `stripe-billing`: Integración con Stripe para suscripciones, trials, checkout y webhooks de pagos
- `plan-enforcement`: Control de acceso y límites según el plan activo del tenant (usuarios, features)

### Modified Capabilities

## Impact

- **Backend**: Se agregan rutas `/api/billing` (checkout, webhooks, portal), se instala `stripe` npm package
- **Frontend**: Nueva página de selección de plan y estado de suscripción
- **Master DB**: Se agregan campos `stripeCustomerId`, `stripeSubscriptionId`, `planStatus`, `trialEndsAt` al modelo Tenant
- **Dependencias**: `stripe` (backend)
- **Flujo de registro**: Después de crear el tenant, se redirige a selección de plan → Stripe Checkout
