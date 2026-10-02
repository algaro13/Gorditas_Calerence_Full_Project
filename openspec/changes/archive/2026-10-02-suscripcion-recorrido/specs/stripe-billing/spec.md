## MODIFIED Requirements

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

## ADDED Requirements

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
