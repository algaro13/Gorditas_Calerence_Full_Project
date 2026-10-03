## ADDED Requirements

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
