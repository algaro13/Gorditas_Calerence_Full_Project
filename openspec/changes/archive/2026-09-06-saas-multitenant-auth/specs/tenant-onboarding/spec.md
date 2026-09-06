## ADDED Requirements

### Requirement: Self-service tenant registration
The system SHALL allow new users to register their restaurant through `pos.kustodela.com` without manual intervention.

#### Scenario: New user registers restaurant
- **WHEN** a user visits `pos.kustodela.com` and clicks "Registrar mi restaurante"
- **THEN** they authenticate via Microsoft Entra (login or sign-up)
- **THEN** they are presented with a form to enter their business name

#### Scenario: Slug generated from business name
- **WHEN** the user enters "Gorditas El Sazón" as their business name
- **THEN** the system generates a slug `el-sazon` and shows the preview `pos-el-sazon.kustodela.com`

#### Scenario: Slug uniqueness validated
- **WHEN** the user chooses a slug that already exists
- **THEN** the system shows "Este nombre ya está en uso" and suggests alternatives

### Requirement: Automatic tenant provisioning
The system SHALL automatically create all necessary resources for a new tenant upon registration completion.

#### Scenario: Database created on registration
- **WHEN** a user completes the registration form
- **THEN** the system creates a new MongoDB database with the full POS schema and indexes

#### Scenario: Admin user assigned
- **WHEN** the tenant is created
- **THEN** the registering user is assigned as Admin of that tenant in `kustodela_master.tenant_users`

#### Scenario: Subdomain active immediately
- **WHEN** provisioning completes
- **THEN** the user is redirected to `pos-{slug}.kustodela.com` and can start using the system immediately (wildcard DNS handles routing)

### Requirement: Existing tenant migration
The system SHALL support migrating the existing "Gorditas Calerence" data as the first tenant.

#### Scenario: Existing database linked
- **WHEN** the migration runs
- **THEN** the current database `mi_tienda_gorditas` is registered in the master DB as tenant with slug `gorditas-calerence`

#### Scenario: Existing users linked to Entra
- **WHEN** an existing user logs in with Microsoft Entra for the first time
- **THEN** they can be linked to their existing tenant account by email matching
