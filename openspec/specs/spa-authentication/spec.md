# spa-authentication Specification

## Purpose
TBD - created by archiving change frontend-zitadel. Update Purpose after archive.
## Requirements
### Requirement: Login resolves the restaurant from the host
The SPA SHALL derive the tenant slug from `window.location.hostname` against `VITE_APP_DOMAIN` (or `localStorage.devTenantSlug` on localhost), fetch `GET /api/tenants/by-slug/:slug` and start the OIDC authorization code flow with PKCE against Zitadel adding the scope `urn:zitadel:iam:org:id:<orgId>`.

#### Scenario: Tenant subdomain
- **WHEN** a user opens `https://demo.<APP_DOMAIN>/login` and clicks "Iniciar sesión"
- **THEN** the browser is redirected to Zitadel with the organization scope of `demo`, and after login returns to `/callback` and lands on the role's default route

#### Scenario: No slug on the host
- **WHEN** the host has no tenant slug (e.g. the app host)
- **THEN** the login page shows a link to the registration and, on localhost, a field to set `devTenantSlug`

### Requirement: Roles from the access token
The SPA SHALL read roles from the access token claim `urn:zitadel:iam:org:project:<PROJECT_ID>:roles` filtered by the token's organization, expose `user.roles` and keep `user.nombreTipoUsuario` as the primary role.

#### Scenario: User with two roles
- **WHEN** the token grants Mesero and Cocinero
- **THEN** menu items allowed for either role are visible and `nombreTipoUsuario` is `Mesero`

### Requirement: API calls carry the access token and react to 401
All requests through `apiService` SHALL send `Authorization: Bearer <access_token>`; a 401 SHALL trigger a new sign-in redirect.

#### Scenario: Expired session
- **WHEN** the API answers 401 after the refresh token can no longer renew
- **THEN** the user is sent to Zitadel to sign in again

### Requirement: Organization without tenant
When `GET /api/tenants/me` responds 404 `NO_TENANT` the SPA SHALL show a "sin restaurante" page with links to registration and logout, never granting a default role.

#### Scenario: Token of an organization not registered
- **WHEN** a valid session belongs to an organization with no tenant row
- **THEN** the "sin restaurante" page is shown and no POS route renders

