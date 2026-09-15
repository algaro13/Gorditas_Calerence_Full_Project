## ADDED Requirements

### Requirement: The user limit derives from the contracted plan
The tenant's `maxUsuarios` SHALL be set from the contracted plan, and the staff limit SHALL be enforced against that value, so that changing plan changes what the product actually allows and not only what it stores.

#### Scenario: Each plan imposes its declared limit
- **WHEN** a subscription becomes active for a plan
- **THEN** `GET /api/billing/status` reports the `maxUsuarios` that plan declares

#### Scenario: Upgrading widens the limit in practice
- **WHEN** a tenant at its limit upgrades to a plan with a higher one
- **THEN** an invitation that was previously rejected with `USER_LIMIT_REACHED` now succeeds
