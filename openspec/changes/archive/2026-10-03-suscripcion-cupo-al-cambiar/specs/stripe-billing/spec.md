## ADDED Requirements

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
