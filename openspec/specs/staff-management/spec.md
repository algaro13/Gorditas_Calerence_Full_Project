# staff-management Specification

## Purpose
TBD - created by archiving change pos-core-modules. Update Purpose after archive.
## Requirements
### Requirement: Staff managed through the identity provider
The system SHALL expose `GET /api/usuarios` (mirror list), `POST /api/usuarios` (`nombre`, `apellido`, `email`, `role`), `PUT /api/usuarios/:id` (`nombre`, `role`, `activo`), `DELETE /api/usuarios/:id` and `POST /api/usuarios/:id/resend-invite`. Creating a user SHALL create it in the identity provider inside the tenant organization, assign the role through the project grant, send the set-password link and insert the mirror row.

#### Scenario: Admin invites a Mesero
- **WHEN** an Admin posts a new user with role Mesero
- **THEN** the identity provider has the user with that role, a set-password link was requested, and the mirror row exists with `activo = true`

#### Scenario: Encargado cannot create Admins
- **WHEN** an Encargado posts a user with role Admin or Encargado
- **THEN** the API responds 403

#### Scenario: Plan user limit
- **WHEN** the tenant already has `maxUsuarios` active members
- **THEN** creating another responds 403 with code `USER_LIMIT_REACHED`

#### Scenario: Protection of the last Admin
- **WHEN** an Admin tries to delete or deactivate the only active Admin (including themselves)
- **THEN** the API responds 400

### Requirement: Legacy user catalog compatibility
`GET /api/catalogos/usuario` SHALL return the mirror list shaped as `{ _id, nombre, email, nombreTipoUsuario, activo }`; `POST|PUT|DELETE /api/catalogos/usuario` SHALL respond 400 pointing to `/api/usuarios`.

#### Scenario: Old form posts a password
- **WHEN** the client posts to `/api/catalogos/usuario`
- **THEN** the API responds 400 "Los usuarios se administran en /api/usuarios"

