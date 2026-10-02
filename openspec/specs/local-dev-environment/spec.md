# local-dev-environment Specification

## Purpose
TBD - created by archiving change postgres-zitadel-foundation. Update Purpose after archive.
## Requirements
### Requirement: Local stack starts with one command
The system SHALL provide a `docker-compose.dev.yaml` that starts PostgreSQL, Zitadel, Zitadel Login v2 and Mailpit, and a `dev:up` command that waits for health checks, bootstraps Zitadel and applies database migrations.

#### Scenario: Fresh clone
- **WHEN** a developer runs `npm run dev:up` on a machine with Docker and Node 22
- **THEN** PostgreSQL answers on port 5432 with databases `kustodela`, `kustodela_test` and `zitadel`, Zitadel answers on `http://localhost:8080/.well-known/openid-configuration`, Mailpit UI answers on port 8025, and the `kustodela` schema is migrated

#### Scenario: Re-run is idempotent
- **WHEN** `dev:up` is executed a second time
- **THEN** no duplicate Zitadel project, roles or applications are created and the command exits successfully

### Requirement: Zitadel bootstrap without console clicks
The system SHALL provide `scripts/zitadel-bootstrap.ts` that creates the project "Kustodela POS", the five roles, the SPA application with Development Mode and redirect `http://localhost:5173/callback`, configures SMTP to Mailpit and writes the resulting ids to `.env.development` files.

#### Scenario: Ids written to env files
- **WHEN** the bootstrap finishes
- **THEN** `Gorditas_Calerence_Backend/.env.development` contains `ZITADEL_PROJECT_ID`, `ZITADEL_DEFAULT_ORG_ID`, `ZITADEL_SPA_APP_ID` and `ZITADEL_PAT`, and `Gorditas_frontend/project/.env.development` contains `VITE_ZITADEL_CLIENT_ID`

### Requirement: Emails are captured locally
The system SHALL route all Zitadel emails to Mailpit in the local environment.

#### Scenario: Invitation email
- **WHEN** a user is created in Zitadel locally with `sendCode: true`
- **THEN** the email appears in the Mailpit inbox at `http://localhost:8025`

### Requirement: Tests run per layer
The system SHALL provide `npm run test:unit` (no database) and `npm run test` (unit + integration against `kustodela_test` + e2e with local JWKS and fake identity provider).

#### Scenario: Unit tests without docker
- **WHEN** `npm run test:unit` runs with docker stopped
- **THEN** all unit tests pass

### Requirement: Browser tests reach the API the app uses
Browser tests that call the API directly SHALL resolve its address the same way the SPA does —`VITE_API_URL` from the environment, then from `.env.development`, then the same default— and MAY be overridden with `E2E_API_URL`. No test SHALL write the API's address by hand.

When a test and the app talk to different servers, a failure blames the feature for something that belongs to the environment.

#### Scenario: Backend on another port
- **WHEN** the backend runs on port 5001 and the SPA is started with `VITE_API_URL` pointing to it
- **THEN** the browser tests that prepare data through the API reach that same backend and pass

#### Scenario: Nothing configured
- **WHEN** no variable is set
- **THEN** the tests use the address in `Gorditas_frontend/project/.env.development`, as the app does

