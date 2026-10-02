## MODIFIED Requirements

### Requirement: Checkout, portal and status
`POST /api/billing/create-checkout` (authenticated, tenant context, no plan guard) SHALL ensure a Stripe customer for the tenant and return a Checkout url whose success and cancel urls point to the tenant subdomain; `POST /api/billing/create-portal` SHALL return a Billing Portal url whose return url is the tenant's subscription screen, or 400 when the tenant has no customer; `GET /api/billing/status` SHALL return `{ plan, planStatus, trialEndsAt, maxUsuarios, currentPeriodEnd, cancelAt, usuariosActivos, tieneClienteStripe }`; `GET /api/billing/plans` SHALL be public.

`usuariosActivos` SHALL count the tenant's active staff, the same people the staff limit counts. `tieneClienteStripe` SHALL say whether the portal can be opened, so the screen does not offer a button that answers 400.

#### Scenario: Expired trial can still pay
- **WHEN** a tenant with an expired trial calls `create-checkout`
- **THEN** the API responds 200 with a url (the plan guard does not apply to billing)

#### Scenario: Unknown plan
- **WHEN** `plan` is not one of the three plans
- **THEN** the API responds 400 "Plan no válido"

#### Scenario: Status of a tenant that has never paid
- **WHEN** a tenant on trial with no Stripe customer asks for its status
- **THEN** `currentPeriodEnd` and `cancelAt` are null, `tieneClienteStripe` is false and `usuariosActivos` counts its active staff

## ADDED Requirements

### Requirement: The subscription's dates are stored
When the webhook applies a subscription, the system SHALL store the end of its current period and, when a cancellation is scheduled, the date it takes effect. The period end SHALL be read from the subscription's first item, where the current Stripe API reports it; the cancellation date SHALL be `cancel_at`, or the period end when only `cancel_at_period_end` is set. When the subscription is deleted the scheduled cancellation SHALL be cleared, since it already happened.

Without the dates the administrator cannot tell when they will be charged next, nor that a subscription cancelled from the portal will stop at the end of the month.

#### Scenario: A renewal date
- **WHEN** a subscription whose current period ends on a given date is applied
- **THEN** `GET /api/billing/status` reports that date as `currentPeriodEnd` and `cancelAt` is null

#### Scenario: Cancelled from the portal
- **WHEN** the administrator cancels in the portal and Stripe sends the subscription with `cancel_at_period_end`
- **THEN** the status stays `active` and `cancelAt` equals the end of the period

### Requirement: The administrator has a place for the subscription
The SPA SHALL offer a "Suscripción" entry in the navigation, visible only to the Admin role, that opens a subscription screen inside the regular layout. Other roles SHALL NOT see the entry and SHALL be sent away if they open its address.

The screen SHALL state, in Spanish, the plan, its status, the trial days left or the renewal date, the cancellation date when one is scheduled, and the active users against the plan's limit. It SHALL offer to change plan and, when the tenant has a Stripe customer, to manage payment and invoices in the Stripe portal.

#### Scenario: An Admin looks for the subscription
- **WHEN** an Admin opens the menu
- **THEN** "Suscripción" is there and leads to a screen with the plan, its status and its dates

#### Scenario: A waiter types the address
- **WHEN** a Mesero opens `/suscripcion`
- **THEN** the menu does not show the entry and the screen is not rendered

### Requirement: A failed payment is told before it stops the restaurant
When the subscription is `past_due`, the dashboard SHALL show a prominent notice asking to update the payment method, leading to the subscription screen. When an active subscription has a scheduled cancellation, the dashboard SHALL say on which date it ends.

A failed charge does not stop the restaurant, so nothing else on the screen reveals it; the first sign used to be the point of sale going into pause once Stripe gave up retrying.

#### Scenario: The card was declined
- **WHEN** the tenant's status is `past_due`
- **THEN** the dashboard shows a red notice about the pending payment with a way to the subscription screen

#### Scenario: Plan status is shown in words
- **WHEN** any screen names the current plan or its status
- **THEN** it uses the Spanish name ("Prueba gratuita", "Activo", "Pago pendiente"…) and not the internal value
