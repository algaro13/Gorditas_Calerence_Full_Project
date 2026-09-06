# tenant-branding Specification

## Purpose
TBD - created by archiving change onboarding-billing. Update Purpose after archive.
## Requirements
### Requirement: Tenant configuration
`PUT /api/tenants/me/config` (Admin) SHALL accept `paleta` (one of orange, red, green, blue, purple, brown, dark) and `imagen` (null or a path under `/uploads/<tenantId>/`), persist them in `tenants.config` and invalidate the cached tenant so the next request sees the change.

#### Scenario: Palette change
- **WHEN** an Admin sets `paleta: 'blue'`
- **THEN** `GET /api/tenants/me` returns `config.paleta = 'blue'` immediately

#### Scenario: Foreign image path rejected
- **WHEN** `imagen` points outside the tenant folder
- **THEN** the API responds 400

### Requirement: Tenant logo upload
`POST /api/tenants/me/logo` (Admin) SHALL store the file as `uploads/<tenantId>/logo.<ext>` and return its public path.

#### Scenario: Upload and serve
- **WHEN** an Admin uploads a PNG
- **THEN** the response url is `/uploads/<tenantId>/logo.png` and `GET` on that path serves the file

