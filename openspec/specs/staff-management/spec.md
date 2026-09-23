# staff-management Specification

## Purpose
TBD - created by archiving change pos-core-modules. Update Purpose after archive.
## Requirements
### Requirement: Staff managed through the identity provider
The system SHALL expose `GET /api/usuarios` (mirror list), `POST /api/usuarios` (`nombre`, `apellido`, `email`, `role`), `PUT /api/usuarios/:id` (`nombre`, `role`, `activo`), `DELETE /api/usuarios/:id` and `POST /api/usuarios/:id/resend-invite`. Creating a user SHALL create it in the identity provider inside the tenant organization, assign the role through the project grant, send the set-password link and insert the mirror row.

The plan user limit SHALL be checked both when creating a member and when reactivating a deactivated one, so that deactivating and reactivating cannot be used to exceed it.

#### Scenario: Admin invites a Mesero
- **WHEN** an Admin posts a new user with role Mesero
- **THEN** the identity provider has the user with that role, a set-password link was requested, and the mirror row exists with `activo = true`

#### Scenario: Encargado cannot create Admins
- **WHEN** an Encargado posts a user with role Admin or Encargado
- **THEN** the API responds 403

#### Scenario: Plan user limit
- **WHEN** the tenant already has `maxUsuarios` active members
- **THEN** creating another responds 403 with code `USER_LIMIT_REACHED` and no member is created

#### Scenario: Reactivation cannot exceed the limit
- **WHEN** a member is deactivated, the freed seat is taken by a new member, and the deactivated one is reactivated
- **THEN** the API responds 403 with code `USER_LIMIT_REACHED` and the member stays inactive

#### Scenario: Protection of the last Admin
- **WHEN** an Admin tries to delete or deactivate the only active Admin (including themselves)
- **THEN** the API responds 400

### Requirement: Legacy user catalog compatibility
`GET /api/catalogos/usuario` SHALL return the mirror list shaped as `{ _id, nombre, email, nombreTipoUsuario, activo }`; `POST|PUT|DELETE /api/catalogos/usuario` SHALL respond 400 pointing to `/api/usuarios`.

#### Scenario: Old form posts a password
- **WHEN** the client posts to `/api/catalogos/usuario`
- **THEN** the API responds 400 "Los usuarios se administran en /api/usuarios"

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

### Requirement: The quota evaluation runs without manual setup
The daily quota evaluation SHALL be scheduled by the backend itself, so that starting the stack is enough to make the grace period expire. It SHALL NOT depend on a host cron entry, a separate container, or any step performed outside the repository, so that a server rebuilt from a backup resumes the evaluation with no manual action.

The evaluation SHALL run shortly after the backend starts and then at a fixed interval of 24 hours, rather than at a fixed time of day, so that a restart cannot skip a day. A run SHALL be skipped while the previous one is still in progress. The scheduler SHALL stop cleanly when the process shuts down, and SHALL NOT run in the test environment.

Running the evaluation more often than necessary SHALL be harmless: the grace period restarts from zero after an adjustment, so a repeated run never deactivates more members than the plan requires.

A manual entry point SHALL remain available for running the evaluation on demand during an incident.

#### Scenario: A fresh or restored server
- **WHEN** the stack is started on a new VPS, or on one rebuilt from a backup
- **THEN** the quota evaluation is scheduled automatically, with no cron entry to install and no step to remember in the recovery runbook

#### Scenario: A run is still in progress
- **WHEN** the interval elapses while the previous evaluation has not finished
- **THEN** the new run is skipped and the reason is recorded, instead of two evaluations overlapping

#### Scenario: Shutdown
- **WHEN** the process is asked to shut down
- **THEN** the scheduler stops and leaves no pending timer behind

