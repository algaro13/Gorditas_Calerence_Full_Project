## ADDED Requirements

### Requirement: A blocked plan is told, not hidden
When the plan does not allow operating, the system SHALL say so where the user is, instead of letting screens come back empty.

`GET /api/tenants/me` SHALL state whether access is blocked and for which reason, decided by the same rule that blocks the business routes, so that the two cannot drift apart.

The SPA SHALL take a blocked restaurant to the plans screen, which SHALL explain what happened, and SHALL do the same when any call answers 403 with a plan reason, since a plan can lapse while a session is open. Signing out and the screens that do not depend on the plan SHALL remain reachable.

#### Scenario: The trial ran out yesterday
- **WHEN** an Admin whose trial has expired opens the POS
- **THEN** they are taken to the plans screen with an explanation, instead of finding empty lists and actions that do nothing

#### Scenario: The plan lapses mid-shift
- **WHEN** a call answers 403 with a plan reason while the session is open
- **THEN** the app stops showing an empty POS and takes the user to the plans screen

#### Scenario: A restaurant that is up to date
- **WHEN** the plan is active
- **THEN** nothing changes for the user
