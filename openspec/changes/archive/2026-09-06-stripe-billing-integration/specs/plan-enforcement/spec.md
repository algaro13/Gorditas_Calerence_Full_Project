## ADDED Requirements

### Requirement: Access blocked for expired or canceled tenants
The system SHALL block API access for tenants whose subscription is not active or trial has expired.

#### Scenario: Active subscription allows access
- **WHEN** a request comes from a tenant with `planStatus: 'active'`
- **THEN** the request proceeds normally

#### Scenario: Valid trial allows access
- **WHEN** a request comes from a tenant with `planStatus: 'trial'` and `trialEndsAt` is in the future
- **THEN** the request proceeds normally

#### Scenario: Expired trial blocks access
- **WHEN** a request comes from a tenant with `planStatus: 'trial'` and `trialEndsAt` is in the past
- **THEN** the API responds with 403 and message "Tu periodo de prueba ha expirado. Selecciona un plan para continuar."

#### Scenario: Canceled subscription blocks access
- **WHEN** a request comes from a tenant with `planStatus: 'canceled'`
- **THEN** the API responds with 403 and message "Suscripción cancelada. Reactiva tu plan para continuar."

### Requirement: User limit enforced by plan
The system SHALL prevent adding more users than the plan allows.

#### Scenario: Within user limit
- **WHEN** a tenant on plan Básico (3 users max) has 2 active users and tries to add another
- **THEN** the operation succeeds

#### Scenario: Exceeds user limit
- **WHEN** a tenant on plan Básico (3 users max) has 3 active users and tries to add another
- **THEN** the API responds with 403 and message "Has alcanzado el límite de usuarios de tu plan. Actualiza tu plan para agregar más."
