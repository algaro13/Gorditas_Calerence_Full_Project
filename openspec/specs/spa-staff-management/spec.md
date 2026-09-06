# spa-staff-management Specification

## Purpose
TBD - created by archiving change frontend-zitadel. Update Purpose after archive.
## Requirements
### Requirement: Staff panel without passwords
The Catálogos page SHALL render a dedicated staff panel for "Usuarios" backed by `/api/usuarios`: list (name, email, role, active, last seen), invite (nombre, apellido, correo, rol), change role, activate/deactivate, delete and resend invitation. Role options SHALL follow the actor's permissions (Encargado only operational roles).

#### Scenario: Invite a waiter
- **WHEN** an Admin invites a Mesero
- **THEN** the list shows the new member as active and a confirmation says an email was sent

#### Scenario: API refusal
- **WHEN** the API responds 403 `USER_LIMIT_REACHED` or 400 (último administrador)
- **THEN** the panel shows the API message and keeps the list unchanged

