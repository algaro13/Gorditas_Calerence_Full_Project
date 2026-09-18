## ADDED Requirements

### Requirement: Grace period when the tenant exceeds its plan
A tenant with more active members than its plan allows SHALL be given a grace period of 15 days, recorded from the day the excess is first detected, and SHALL NOT be cut back before it expires.

A daily job SHALL, for every tenant, start the grace period when the excess appears, clear it as soon as the tenant fits again — whether because members were deactivated or deleted, or because the plan grew — and, when the period has expired, deactivate as many members as needed to fit.

Members SHALL be chosen for deactivation by longest time without signing in, those who never signed in first. The last active Admin SHALL never be chosen; if fitting would require it, the tenant SHALL be left one seat over and the situation reported rather than leaving the restaurant unmanageable.

Members deactivated this way SHALL be deactivated in the identity provider too, exactly as a manual deactivation, and SHALL be reactivatable by an Admin subject to the usual limit.

An automatic deactivation SHALL be recorded as such, distinguishable from a manual one, so that the tenant can be told what happened and to whom. Reactivating a member SHALL clear that record. The record SHALL be reported for a limited window after the fact, not indefinitely.

#### Scenario: The tenant fits again before the deadline
- **WHEN** a tenant over its limit deactivates a member, or moves to a plan that fits, before the 15 days elapse
- **THEN** the grace period is cleared and nobody is deactivated automatically

#### Scenario: The deadline passes
- **WHEN** the grace period of a tenant still over its limit expires
- **THEN** the members who went longest without signing in are deactivated until the tenant fits, and the change is visible in the staff list

#### Scenario: The tenant is told what the system did
- **WHEN** the daily job has deactivated members of a tenant
- **THEN** the tenant's quota status reports those members, so the staff panel can name them and the deactivation is never silent

#### Scenario: Fitting would remove the last Admin
- **WHEN** deactivating enough members would leave no active Admin
- **THEN** the last active Admin is kept, the tenant stays one seat over, and the case is reported
