## MODIFIED Requirements

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
