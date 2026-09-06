## ADDED Requirements

### Requirement: Frontend authenticates via MSAL React
The system SHALL use `@azure/msal-react` to handle user authentication against Microsoft Entra External ID. The frontend MUST NOT store or manage passwords directly.

#### Scenario: User logs in
- **WHEN** a user clicks "Iniciar sesión" on any `pos-*.kustodela.com` subdomain
- **THEN** the MSAL library redirects to Microsoft Entra login page
- **THEN** upon successful authentication, the user is redirected back with a valid JWT token

#### Scenario: User registers
- **WHEN** a new user clicks "Crear cuenta"
- **THEN** Microsoft Entra handles the sign-up flow (email verification, password creation)
- **THEN** after registration, the user is redirected back to the application

#### Scenario: User resets password
- **WHEN** a user clicks "Olvidé mi contraseña"
- **THEN** Microsoft Entra handles the password reset flow via email
- **THEN** the user can login with the new password without intervention from the application

### Requirement: Backend validates Entra tokens
The system SHALL validate JWT tokens issued by Microsoft Entra on every authenticated API request. The backend MUST NOT issue its own tokens.

#### Scenario: Valid token accepted
- **WHEN** a request arrives with a valid Bearer token from Microsoft Entra
- **THEN** the backend extracts the user's `oid` (Object ID) and proceeds with the request

#### Scenario: Invalid or expired token rejected
- **WHEN** a request arrives with an invalid, expired, or missing token
- **THEN** the backend responds with HTTP 401

#### Scenario: Token validation uses cached JWKS
- **WHEN** the backend validates a token signature
- **THEN** it uses cached JSON Web Key Set (JWKS) from Microsoft's well-known endpoint to avoid network calls per request

### Requirement: User identity linked to tenant
The system SHALL maintain a mapping between Microsoft Entra user IDs (`oid`) and tenant assignments in the Master Database.

#### Scenario: Authenticated user resolved to tenant
- **WHEN** a valid token is received
- **THEN** the backend looks up the user's `oid` in `kustodela_master.tenant_users` to determine their tenant and role

#### Scenario: User belongs to no tenant
- **WHEN** a valid token is received but the `oid` has no tenant assignment
- **THEN** the backend responds with HTTP 403 and a message to complete onboarding
