## MODIFIED Requirements

### Requirement: Staff panel without passwords
The Catálogos page SHALL render a dedicated staff panel for "Usuarios" backed by `/api/usuarios`: list (name, email, role, active, last seen), invite (nombre, apellido, correo, rol), change role, activate/deactivate, delete and resend invitation. Role options SHALL follow the actor's permissions (Encargado only operational roles).

When the tenant has more active members than its plan allows — which happens after downgrading, since no one is deactivated automatically — the panel SHALL say so prominently, state how many seats are over, and offer the two ways out: deactivate members or change plan. While over the limit the panel SHALL NOT offer the invite form, because inviting is guaranteed to fail.

#### Scenario: Invite a waiter
- **WHEN** an Admin invites a Mesero
- **THEN** the list shows the new member as active and a confirmation says an email was sent

#### Scenario: API refusal
- **WHEN** the API responds 403 `USER_LIMIT_REACHED` or 400 (último administrador)
- **THEN** the panel shows the API message and keeps the list unchanged

#### Scenario: Over the plan after a downgrade
- **WHEN** the tenant has more active members than `maxUsuarios`
- **THEN** the panel shows a prominent notice naming how many seats are over and what to do, and the invite form is not offered
