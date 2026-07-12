## ADDED Requirements

### Requirement: Users without tenant are redirected to onboarding
The system SHALL detect when an authenticated user has no tenant assigned and redirect them to the onboarding wizard.

#### Scenario: New user after Microsoft login
- **WHEN** a user completes login with Microsoft Entra and has no TenantUser record
- **THEN** the frontend redirects to `/onboarding`

### Requirement: Step 1 — Business name and subdomain
The system SHALL allow the user to enter their business name and choose a subdomain with real-time availability validation.

#### Scenario: Slug generated from name
- **WHEN** the user types "Gorditas El Sazón"
- **THEN** the system suggests slug `el-sazon` and shows preview `pos-el-sazon.kustodela.com`

#### Scenario: Slug availability check
- **WHEN** the user modifies the slug
- **THEN** the system checks availability in real-time and shows ✅ or ❌

### Requirement: Step 4 — Mesa configuration
The system SHALL allow the user to specify how many mesas their restaurant has and create them automatically.

#### Scenario: User sets 5 mesas
- **WHEN** the user enters 5 as the number of mesas
- **THEN** the system will create Mesa 1 through Mesa 5 in the tenant DB upon completion

### Requirement: Step 5 — Quick catalog (optional)
The system SHALL allow the user to add initial platillos and guisos, with an option to skip.

#### Scenario: User adds platillos
- **WHEN** the user adds "Gordita de chicharrón" at $25
- **THEN** it is added to the initial catalog list

#### Scenario: User skips catalog
- **WHEN** the user clicks "Lo haré después"
- **THEN** the system proceeds to completion without creating catalog items

### Requirement: Onboarding completion creates all resources
The system SHALL create tenant, provision database, create initial data, and redirect to the system upon wizard completion.

#### Scenario: Wizard completed
- **WHEN** the user clicks "Completar" on the last step
- **THEN** tenant is created in master DB, database is provisioned, mesas and catalog are created, user is assigned as Admin
- **THEN** user is redirected to their subdomain `pos-{slug}.kustodela.com` (or Dashboard in development)
