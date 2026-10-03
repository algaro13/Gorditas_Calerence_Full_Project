## ADDED Requirements

### Requirement: Plans and prices have a single source
The plan catalog served by `GET /api/billing/plans` SHALL be the only place where plans, prices, user limits and features are defined. The plans screen and the public landing SHALL read it instead of keeping their own copies, and SHALL show a loading state and a notice when it cannot be loaded. "Unlimited users" SHALL be named by the backend and reported as `usuariosIlimitados`, not inferred from a magic number in the screens.

The features listed SHALL be true for the plan that lists them. Features available in every plan SHALL be listed in the base plan, and no plan SHALL list a feature the product does not have.

#### Scenario: A price changes
- **WHEN** the catalog's price for a plan changes
- **THEN** the plans screen and the landing show the new price without any change to the frontend

#### Scenario: The same promise everywhere
- **WHEN** a visitor reads a plan on the landing and later on the plans screen
- **THEN** both list the same features

### Requirement: Stripe prices are checked against the catalog
When the payment provider is Stripe, the backend SHALL compare, at startup, each configured `STRIPE_PRICE_*` with the catalog —amount, currency and monthly interval— and SHALL log an error for every difference, without refusing to start.

Otherwise a price changed in Stripe but not in the catalog charges one amount while the screens announce another, and nothing notices.

#### Scenario: Stripe charges a different amount
- **WHEN** the Stripe price configured for Básico is 349 MXN while the catalog says 299
- **THEN** the backend logs an error naming the plan and both amounts when it starts
