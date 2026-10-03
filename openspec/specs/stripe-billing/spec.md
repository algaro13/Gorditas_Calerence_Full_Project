# stripe-billing Specification

## Purpose
TBD - created by archiving change onboarding-billing. Update Purpose after archive.
## Requirements
### Requirement: Verified, idempotent webhook
`POST /api/billing/webhook` SHALL read the raw body, verify the Stripe signature, record the event id in `stripe_events` and process each event at most once; a second delivery SHALL respond 200 `{ received: true, duplicate: true }` without side effects; a handler failure SHALL respond 500 and store the error.

#### Scenario: Invalid signature
- **WHEN** the signature header is missing or wrong
- **THEN** the API responds 400 and nothing is recorded

#### Scenario: Duplicate delivery
- **WHEN** the same `checkout.session.completed` arrives twice
- **THEN** the tenant is updated once and the second response carries `duplicate: true`

### Requirement: Plan derived from the live subscription
On `checkout.session.completed` and `customer.subscription.updated` the system SHALL retrieve the subscription, map its first price id to a plan (`basico`, `profesional`, `empresarial`), set `plan`, `plan_status`, `stripe_subscription_id`, `max_usuarios` and clear `trial_ends_at`; `customer.subscription.deleted` SHALL set `canceled`; `invoice.paid` SHALL set `active`; `invoice.payment_failed` SHALL set `past_due`.

#### Scenario: Checkout completed
- **WHEN** a session for tenant T completes with a subscription whose price is the Profesional price
- **THEN** T has `plan = profesional`, `plan_status = active`, `max_usuarios = 10`

#### Scenario: Payment failure and recovery
- **WHEN** `invoice.payment_failed` then `invoice.paid` arrive for T's subscription
- **THEN** T goes to `past_due` and back to `active`

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

### Requirement: The user limit derives from the contracted plan
The tenant's `maxUsuarios` SHALL be set from the contracted plan, and the staff limit SHALL be enforced against that value, so that changing plan changes what the product actually allows and not only what it stores.

#### Scenario: Each plan imposes its declared limit
- **WHEN** a subscription becomes active for a plan
- **THEN** `GET /api/billing/status` reports the `maxUsuarios` that plan declares

#### Scenario: Upgrading widens the limit in practice
- **WHEN** a tenant at its limit upgrades to a plan with a higher one
- **THEN** an invitation that was previously rejected with `USER_LIMIT_REACHED` now succeeds

### Requirement: A blocked plan is told, not hidden
When the plan does not allow operating, the system SHALL say so where the user is, instead of letting screens come back empty.

`GET /api/tenants/me` SHALL state whether access is blocked and for which reason, decided by the same rule that blocks the business routes, so that the two cannot drift apart.

The SPA SHALL take a blocked restaurant to the plans screen, which SHALL explain what happened, and SHALL do the same when any call answers 403 with a plan reason, since a plan can lapse while a session is open. Signing out and the screens that do not depend on the plan SHALL remain reachable.

The plans screen SHALL offer signing out to every role, since it has no menu of its own. To a role that cannot pay it SHALL say to tell the administrator, instead of asking it to choose a plan it cannot buy.

#### Scenario: The trial ran out yesterday
- **WHEN** an Admin whose trial has expired opens the POS
- **THEN** they are taken to the plans screen with an explanation, instead of finding empty lists and actions that do nothing

#### Scenario: The plan lapses mid-shift
- **WHEN** a call answers 403 with a plan reason while the session is open
- **THEN** the app stops showing an empty POS and takes the user to the plans screen

#### Scenario: A restaurant that is up to date
- **WHEN** the plan is active
- **THEN** nothing changes for the user

#### Scenario: A waiter finds the restaurant paused
- **WHEN** a Mesero opens the POS while the subscription is inactive
- **THEN** the plans screen tells them to let the administrator know and lets them sign out

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

### Requirement: The plan's state and dates read without contradiction
Wherever the SPA states the plan, its status or its dates, the parts of the sentence SHALL agree with each other and with the explanation around them.

An expired trial SHALL read as expired, even though its stored status is still `trial`. A trial ending today or tomorrow SHALL say so in words, not as a date paired with a rounded-up count of days. When a payment is pending, that SHALL be the status shown, even if a cancellation is also scheduled, because an unpaid subscription can pause the restaurant before the cancellation date.

#### Scenario: The trial ends tonight
- **WHEN** the trial ends a few hours from now
- **THEN** the screen says it ends today, not that one day is left

#### Scenario: Paused by an expired trial
- **WHEN** the plans screen explains that the trial ended
- **THEN** the current plan reads as an expired trial, not as a trial in progress

#### Scenario: Unpaid and cancelled at once
- **WHEN** a payment is pending and a cancellation is scheduled
- **THEN** the status reads "Pago pendiente" and the cancellation date is still stated

### Requirement: One live subscription per restaurant
A restaurant SHALL have at most one live subscription. `POST /api/billing/create-checkout` SHALL answer 409 `YA_SUSCRITO` when the tenant's subscription is `active` or `past_due`, since a second Checkout would open a second subscription that keeps charging alongside the first.

#### Scenario: A subscribed restaurant tries to subscribe again
- **WHEN** an Admin whose subscription is active calls `create-checkout`
- **THEN** the API answers 409 `YA_SUSCRITO` and no Checkout session is created

### Requirement: Changing plan updates the existing subscription
`POST /api/billing/change-plan` (authenticated, tenant context, Admin) SHALL change the price of the tenant's live subscription to the requested plan, prorating immediately: the plan and the user limit change at once, and the difference is settled on the next invoice. The tenant SHALL be updated from the resulting subscription right away, by the same rule the webhook applies. It SHALL answer 400 `SIN_SUSCRIPCION` without a live subscription and 400 `MISMO_PLAN` for the current plan.

The plans screen SHALL offer this change, with a confirmation that explains the proration, to a restaurant with a live subscription, and SHALL mark its current plan instead of offering it.

#### Scenario: Upgrading mid-month
- **WHEN** an Admin on an active Básico subscription changes to Profesional
- **THEN** the same subscription now has the Profesional price, the tenant reads `profesional` with `maxUsuarios = 10`, and no second subscription exists

#### Scenario: Choosing the current plan
- **WHEN** an Admin asks to change to the plan they already have
- **THEN** the API answers 400 `MISMO_PLAN` and nothing changes in Stripe

### Requirement: The Stripe customer carries the administrator's email
When creating the Stripe customer, the system SHALL use the email from the access token or, when the token carries none, the email stored for that member of the restaurant, so the first Checkout does not ask for it again.

#### Scenario: Token without email
- **WHEN** an Admin whose token has no `email` claim starts their first Checkout
- **THEN** the Stripe customer is created with the email stored for that member

### Requirement: The billing portal speaks Spanish
The Stripe billing portal SHALL be opened with the `es-419` locale, as Checkout is.

#### Scenario: Opening the portal
- **WHEN** an Admin opens "Administrar pago y facturas"
- **THEN** the portal session is created with locale `es-419`

### Requirement: A downgrade states what happens to the extra users
When an Admin confirms a change to a plan whose user limit is below the restaurant's active users, the confirmation SHALL state how many users would be over the limit, that nobody loses access at the moment of the change, how many days there are to adjust, and that the system would then deactivate first those who have gone longest without signing in. The number of days SHALL come from the backend: `GET /api/billing/status` SHALL include `diasSobreCupo`.

#### Scenario: Downgrading with too many users
- **WHEN** an Admin with 5 active users confirms a change from Profesional to Básico
- **THEN** the confirmation says 2 users would be over the limit and how many days there are to adjust, before anything is changed

#### Scenario: Upgrading
- **WHEN** the chosen plan allows at least as many users as are active
- **THEN** the confirmation carries no such warning

### Requirement: The subscription screen tells the quota deadline
When the restaurant has more active users than its plan allows, the subscription screen SHALL show the same notice as the staff screen —the deadline, the days left and who would be deactivated— computed by the same endpoint, so the two screens cannot tell different stories.

#### Scenario: Over the limit after a downgrade
- **WHEN** a restaurant over its user limit opens the subscription screen
- **THEN** it reads the deadline and the names that would be deactivated, with a way to the staff screen

