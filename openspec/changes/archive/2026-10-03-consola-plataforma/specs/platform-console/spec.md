## ADDED Requirements

### Requirement: Only the platform operator reaches the console
The platform console SHALL be available only to users holding the "Plataforma" project role in the platform's own organization, and whose token belongs to that organization. Restaurants SHALL NOT be able to grant that role. Any other caller SHALL receive 403.

#### Scenario: A restaurant administrator tries the console
- **WHEN** an Admin of a restaurant calls `GET /api/plataforma/resumen`
- **THEN** the API answers 403 and returns no data

#### Scenario: The role from another organization
- **WHEN** a token carries the "Plataforma" role for an organization other than the platform's
- **THEN** the API answers 403

### Requirement: The console summarizes every restaurant's plan and activity
`GET /api/plataforma/resumen` SHALL report, across all restaurants: how many are on trial, on an expired trial, paying per plan, with a pending payment, canceled, and with a plan assigned without a Stripe subscription; the monthly recurring revenue as the sum of catalog prices of live subscriptions; the trial-to-paid conversion among restaurants whose trial has ended; and how many were used in the last 7 days, 8 to 30, 31 to 90 and over 90.

For each restaurant it SHALL report its plan, situation, creation date, trial end or renewal date, active users, last sign-in, last order, orders in the last 30 days and days without use, counted from the latest of its last order and last sign-in, or from its creation if neither ever happened.

The console SHALL only read: it SHALL NOT change, notify or enter any restaurant.

#### Scenario: A restaurant that never used the system
- **WHEN** a restaurant was created 40 days ago and nobody has signed in or taken an order since
- **THEN** it shows 40 days without use and counts in the 31-to-90 bracket

#### Scenario: A plan without Stripe
- **WHEN** a restaurant's plan is active but it has no Stripe subscription
- **THEN** it is reported as "plan sin Stripe" and not counted in the monthly revenue

### Requirement: Every console query is logged
Each request to the console SHALL be recorded in `bitacora_plataforma` with the operator, the action and the time.

#### Scenario: The operator opens the console
- **WHEN** the operator loads the summary
- **THEN** a log entry names the operator, the action "ver-resumen" and the time
