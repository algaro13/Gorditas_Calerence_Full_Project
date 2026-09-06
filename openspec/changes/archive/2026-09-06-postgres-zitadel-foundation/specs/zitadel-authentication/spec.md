## ADDED Requirements

### Requirement: Access tokens validated against Zitadel JWKS
The system SHALL accept only Bearer JWT access tokens issued by `ZITADEL_ISSUER`, verified with the issuer JWKS, RS256, and audience `ZITADEL_AUDIENCE`.

#### Scenario: Valid token
- **WHEN** a request carries a valid Zitadel access token
- **THEN** `req.auth` contains `userId`, `orgId`, `roles[]`, `primaryRole`, `email` and `name`

#### Scenario: Missing or invalid token
- **WHEN** the Authorization header is absent, malformed, expired or signed by another issuer
- **THEN** the API responds 401 with `{ success: false, message: "Token no válido" }` (or "Token no proporcionado")

#### Scenario: Token without organization
- **WHEN** the token lacks `urn:zitadel:iam:user:resourceowner:id`
- **THEN** the API responds 401 "Token sin organización"

### Requirement: Roles are per organization
The system SHALL derive roles from the project roles claim filtered by the token organization id; only `Admin`, `Encargado`, `Mesero`, `Despachador`, `Cocinero` are recognized.

#### Scenario: Role granted in another organization is ignored
- **WHEN** the roles claim contains `Admin` for org B and the token org is A
- **THEN** `req.auth.roles` does not include `Admin`

#### Scenario: Authorization helpers
- **WHEN** a route guarded by `isEncargado` receives a token whose roles are `[Mesero]`
- **THEN** the API responds 403 "No tienes permisos para esta acción"

### Requirement: Tenant resolved from the organization
The system SHALL resolve the tenant by `tenants.zitadel_org_id = req.auth.orgId`, cache it for 60 seconds, respond 404 `NO_TENANT` when absent and 403 when `activo = false`.

#### Scenario: Organization without tenant row
- **WHEN** a valid token belongs to an organization not present in `tenants`
- **THEN** the API responds 404 with code `NO_TENANT`

### Requirement: Identity provider behind a port
The system SHALL access Zitadel management operations only through the `IdentityProvider` port; a `FakeIdentityProvider` SHALL be available for tests and selected with `IDENTITY_PROVIDER=fake`.

#### Scenario: Tests do not call Zitadel
- **WHEN** the e2e suite runs with `IDENTITY_PROVIDER=fake` and `ZITADEL_JWKS_MODE=local`
- **THEN** no network call to Zitadel is made and tokens signed with the local key are accepted

### Requirement: Legacy authentication removed
The system SHALL NOT accept HS256 tokens signed with `JWT_SECRET` nor Microsoft Entra tokens.

#### Scenario: Legacy token
- **WHEN** a request carries a token signed with the old `JWT_SECRET`
- **THEN** the API responds 401
