## ADDED Requirements

### Requirement: Public registration creates organization, admin and tenant in one call
`POST /api/onboarding/complete` SHALL accept `{ admin:{nombre,apellido,email,password}, nombre, slug, paleta, imagen, mesas[], platillos[], guisos[] }` without authentication, create the organization and its admin in the identity provider, grant the project and the Admin role, register the tenant redirect URIs, create the tenant row (plan trial, 14 days, 3 users), seed the initial catalog and the admin mirror row, and respond 201 with `{ tenant:{slug,nombre,url,config}, user:{email,role}, url }`.

#### Scenario: Successful registration
- **WHEN** a valid payload with a free slug is posted
- **THEN** the identity provider has an organization with one Admin user, `tenants` has the row with `provisioning_status = ready`, the seed contains the requested mesas plus "Nuevo pedido", the guisos and platillos, and the response url is the tenant subdomain

#### Scenario: Slug taken or reserved
- **WHEN** the slug already exists or is reserved (`app`, `api`, `auth`, ...)
- **THEN** the API responds 409 (taken) or 400 (invalid/reserved) and nothing is created

#### Scenario: Database failure rolls back the organization
- **WHEN** the tenant transaction fails after the organization was created
- **THEN** the organization is deleted from the identity provider, no tenant row remains and the API responds 500 `ONBOARDING_FAILED`

#### Scenario: Weak password
- **WHEN** the admin password has fewer than 8 characters or lacks a letter or a digit
- **THEN** the API responds 400 before calling the identity provider

### Requirement: Logo upload
`POST /api/onboarding/upload-image` (public) SHALL accept one JPEG/PNG/WebP up to 2 MB and store it in a temporary folder, returning its temporary url; `POST /api/onboarding/complete` SHALL move it to the tenant folder and set `config.imagen`.

#### Scenario: Invalid file
- **WHEN** a PDF or a 3 MB image is uploaded
- **THEN** the API responds 400

### Requirement: Registration is rate limited
The public onboarding endpoints SHALL be rate limited per IP.

#### Scenario: Abuse
- **WHEN** an IP exceeds the limit
- **THEN** the API responds 429
