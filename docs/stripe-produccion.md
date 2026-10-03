# Cobrar de verdad con Stripe

Pasos para pasar de modo test a cobrar en producción. En local se prueba con modo test y
`stripe listen` (ver `docs/local-testing.md`); aquí se configura la cuenta en modo live y el
servidor.

Todo lo de Stripe se hace en el dashboard con el interruptor de **modo test apagado**. Productos,
precios, webhooks y configuración del portal son independientes entre modo test y live: lo que se
creó en el sandbox no existe en live.

## 1. Cuenta de Stripe

- **Activar la cuenta** (datos fiscales y cuenta bancaria). Sin esto Stripe no deja crear claves live.
- **Correos a clientes** (*Settings → Customer emails*): activar los avisos de **pago fallido** y de
  **tarjeta por vencer**, y los recibos de pago. La app avisa en el panel, pero solo a quien entra;
  estos correos llegan aunque el administrador no abra el sistema.
- **Reintentos** (*Settings → Billing → Subscriptions and emails → Manage failed payments*): elegir
  cuántos reintentos y qué hacer al agotarlos. La app trata `past_due` como «pago pendiente» (sigue
  operando, con aviso rojo) y `canceled` o `unpaid` como suscripción inactiva (acceso en pausa). Lo
  recomendado es **cancelar la suscripción** al agotar los reintentos.

## 2. Productos y precios

Crear en modo live los tres productos con su precio mensual en MXN. Tienen que coincidir con lo que
la app muestra en `/planes` y con `PLAN_LIMITS` (`src/shared/domain/Tenant.ts`):

| Plan | Precio mensual | Usuarios | `metadata.planId` |
|---|---|---|---|
| Kustodela POS - Básico | $299 MXN | 3 | `basico` |
| Kustodela POS - Profesional | $599 MXN | 10 | `profesional` |
| Kustodela POS - Empresarial | $999 MXN | ilimitados | `empresarial` |

Se pueden crear a mano o con el script del backend, usando la clave live:

```bash
cd Gorditas_Calerence_Backend
STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/setup-stripe-products.ts
```

Anota los tres `price_...` que imprime.

Si un precio cambia, en Stripe se crea uno **nuevo** (los precios no se editan) y se actualiza la
variable. Las suscripciones existentes siguen con el precio viejo hasta que se cambien.

## 3. Webhook

*Developers → Webhooks → Add endpoint*:

- **URL**: `https://api.<APP_DOMAIN>/api/billing/webhook`
- **Eventos** (solo estos seis; la app ignora los demás):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Al crearlo, copia el **signing secret** (`whsec_...`) de ese endpoint. **No** sirve el de
`stripe listen`: ese es solo para local.

## 4. Portal de clientes

*Settings → Billing → Customer portal* (modo live):

- Permitir **actualizar el método de pago**, **ver facturas** y **cancelar la suscripción**.
- Cancelación: **al final del periodo**. La app la muestra como «Cancelación programada» con la fecha.
- **No** hace falta habilitar el cambio de plan en el portal: lo hace la app desde `/planes`, que
  modifica la suscripción existente con prorrateo inmediato. Si se habilita también en el portal,
  funciona igual (llega como `customer.subscription.updated`), pero son dos caminos para lo mismo.
- Guardar. Sin guardar la configuración, Stripe rechaza abrir el portal en modo live.

## 5. Servidor

En `Gorditas_Calerence_Backend/.env.production`:

```bash
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...          # el del endpoint del paso 3
STRIPE_PRICE_BASICO=price_...
STRIPE_PRICE_PROFESIONAL=price_...
STRIPE_PRICE_EMPRESARIAL=price_...
```

Luego `npm run prod:up`. El contenedor del backend aplica las migraciones al arrancar
(`prisma migrate deploy`), incluida la `0007_periodo_suscripcion` que guarda la fecha de renovación
y la de cancelación.

Para el aviso por correo de fin de prueba, el backend necesita también su SMTP (el mismo proveedor
que usa Zitadel):

```bash
SMTP_HOST=smtp.proveedor.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=Kustodela POS <no-reply@<APP_DOMAIN>>
```

Sin `SMTP_HOST` el aviso solo se escribe en el registro del backend.

Si `PAYMENT_PROVIDER=stripe` pero falta `STRIPE_WEBHOOK_SECRET`, el backend no arranca: es a
propósito, para no aceptar webhooks sin verificar su firma.

## 6. Comprobar

1. **Webhook**: en el dashboard, en el endpoint, *Send test webhook* → `invoice.paid`. Debe
   responder 200 con `{"received":true,"handled":true}`; como la suscripción del evento de prueba
   no es de ningún restaurante, no cambia nada. Un 400 es firma inválida (revisa
   `STRIPE_WEBHOOK_SECRET`).
2. **Un cobro real pequeño**: con un restaurante de prueba, contratar Básico con una tarjeta real y
   reembolsarlo después desde el dashboard. Comprobar que:
   - `/suscripcion` muestra Básico, «Activo» y la fecha de renovación;
   - el portal abre en español y vuelve a `/suscripcion`;
   - cambiar a Profesional desde `/planes` deja **una sola** suscripción en Stripe (*Customers →
     el cliente → Subscriptions*);
   - cancelar desde el portal muestra «Cancelación programada».
3. **Logs**: `docker compose logs backend | grep -i "suscripción\|webhook"`. Cada evento procesado
   queda también en la tabla `stripe_events` (`processed_at` y, si falló, `error`).

## Notas

- **Restaurantes que ya pagaban** antes de la migración `0007`: no tienen guardada la fecha de
  renovación hasta el siguiente evento de su suscripción (la renovación mensual o cualquier cambio).
  Mientras tanto `/suscripcion` muestra el plan y el estado, sin fecha.
- **Fechas**: Stripe muestra las fechas en UTC y la app en la hora del navegador. Una renovación a
  las 01:59 UTC del día 3 es el día 2 a las 19:59 en México; las dos son correctas.
- **Bajar de plan** con más usuarios que el cupo nuevo no expulsa a nadie: se abre un plazo de
  `DIAS_SOBRE_CUPO` días (15) y al vencer el trabajo diario desactiva a quien lleve más tiempo sin
  entrar. La app lo advierte al confirmar el cambio y en `/suscripcion`.
- **Cambio de dominio**: actualizar la URL del webhook (ver `docs/cambiar-dominio.md`, paso 8).
- **Claves**: nunca en el repositorio ni en el chat. Si una clave se expone, *Developers → API keys
  → Roll key*.
