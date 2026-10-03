## ADDED Requirements

### Requirement: The plans screen asks the backend whether a subscription is live
`GET /api/billing/status` SHALL report `suscripcionViva`, computed by the same rule that makes `create-checkout` answer 409 and `change-plan` answer 400: the status is `active` or `past_due` and the tenant has a Stripe subscription. The plans screen SHALL decide between subscribing and changing plan from that value, never from the plan's name or status alone, and SHALL offer neither until it knows. Likewise, it SHALL offer the billing portal only when the backend reports a Stripe customer (`tieneClienteStripe`), since without one the portal cannot open.

A plan can be assigned without Stripe —by the staging seed, by support, by a data migration—. Guessing from the plan made the screen offer a change the backend then refused.

#### Scenario: A plan assigned without Stripe
- **WHEN** a tenant whose plan is Profesional and active, but who has no Stripe subscription, opens the plans screen
- **THEN** it is offered to subscribe through Checkout, not to change plan

#### Scenario: No portal without a Stripe customer
- **WHEN** a tenant without a Stripe customer opens the plans screen
- **THEN** it is not offered to manage its subscription in the portal

#### Scenario: A paying tenant
- **WHEN** a tenant with a live Stripe subscription opens the plans screen
- **THEN** its current plan is marked and the others offer to change plan
