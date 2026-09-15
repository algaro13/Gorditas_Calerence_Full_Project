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
`POST /api/billing/create-checkout` (authenticated, tenant context, no plan guard) SHALL ensure a Stripe customer for the tenant and return a Checkout url whose success and cancel urls point to the tenant subdomain; `POST /api/billing/create-portal` SHALL return a Billing Portal url or 400 when the tenant has no customer; `GET /api/billing/status` SHALL return `{ plan, planStatus, trialEndsAt, maxUsuarios }`; `GET /api/billing/plans` SHALL be public.

#### Scenario: Expired trial can still pay
- **WHEN** a tenant with an expired trial calls `create-checkout`
- **THEN** the API responds 200 with a url (the plan guard does not apply to billing)

#### Scenario: Unknown plan
- **WHEN** `plan` is not one of the three plans
- **THEN** the API responds 400 "Plan no válido"

### Requirement: The user limit derives from the contracted plan
The tenant's `maxUsuarios` SHALL be set from the contracted plan, and the staff limit SHALL be enforced against that value, so that changing plan changes what the product actually allows and not only what it stores.

#### Scenario: Each plan imposes its declared limit
- **WHEN** a subscription becomes active for a plan
- **THEN** `GET /api/billing/status` reports the `maxUsuarios` that plan declares

#### Scenario: Upgrading widens the limit in practice
- **WHEN** a tenant at its limit upgrades to a plan with a higher one
- **THEN** an invitation that was previously rejected with `USER_LIMIT_REACHED` now succeeds

