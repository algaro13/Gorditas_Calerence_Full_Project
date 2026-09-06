## ADDED Requirements

### Requirement: Stripe products and prices configured
The system SHALL have three subscription plans configured in Stripe with monthly recurring prices in MXN.

#### Scenario: Plans exist in Stripe
- **WHEN** the billing system is initialized
- **THEN** three products exist: Básico ($299 MXN/mes, 3 usuarios), Profesional ($599 MXN/mes, 10 usuarios), Empresarial ($999 MXN/mes, ilimitados)

### Requirement: Checkout session creates subscription
The system SHALL create a Stripe Checkout session that starts a subscription for the tenant's selected plan.

#### Scenario: Tenant selects a plan
- **WHEN** a tenant clicks "Seleccionar" on a plan
- **THEN** the backend creates a Checkout session and returns the URL
- **THEN** the frontend redirects to Stripe Checkout

#### Scenario: Checkout completed
- **WHEN** the user completes payment in Stripe Checkout
- **THEN** Stripe redirects back to the app with a success indicator
- **THEN** the tenant's `planStatus` is set to `active`

### Requirement: Trial period of 14 days without payment
The system SHALL grant a 14-day trial to every new tenant automatically upon registration without requiring payment information.

#### Scenario: New tenant gets trial
- **WHEN** a new tenant registers
- **THEN** `plan` is set to `trial`, `planStatus` to `trial`, and `trialEndsAt` to 14 days from now

#### Scenario: Trial expires
- **WHEN** `trialEndsAt` passes and no subscription is active
- **THEN** `planStatus` changes to `expired`

### Requirement: Webhooks sync subscription state
The system SHALL process Stripe webhooks to keep the tenant's billing status synchronized.

#### Scenario: Payment succeeds
- **WHEN** webhook `invoice.paid` is received
- **THEN** the tenant's `planStatus` is set to `active`

#### Scenario: Payment fails
- **WHEN** webhook `invoice.payment_failed` is received
- **THEN** the tenant's `planStatus` is set to `past_due`

#### Scenario: Subscription canceled
- **WHEN** webhook `customer.subscription.deleted` is received
- **THEN** the tenant's `planStatus` is set to `canceled`

### Requirement: Customer portal for subscription management
The system SHALL provide access to Stripe Customer Portal where tenants can update payment method, change plan, or cancel.

#### Scenario: Access customer portal
- **WHEN** a tenant admin clicks "Gestionar suscripción"
- **THEN** the backend creates a portal session and redirects to Stripe's hosted portal
