## ADDED Requirements

### Requirement: Migration creation via CLI
The system SHALL provide an npm script `migrate:create` that generates a new migration file with a timestamped name and up/down function stubs in the `migrations/` directory.

#### Scenario: Create a new migration
- **WHEN** a developer runs `npm run migrate:create -- "agregar-campo-telefono"`
- **THEN** a new file is created at `migrations/YYYYMMDD-agregar-campo-telefono.js` with empty `up(db)` and `down(db)` functions

### Requirement: Apply pending migrations
The system SHALL provide an npm script `migrate:up` that executes all unapplied migrations in chronological order and records each in the `changelog` collection.

#### Scenario: Run pending migrations
- **WHEN** a developer runs `npm run migrate:up`
- **THEN** all migration files not yet recorded in the `changelog` collection are executed in order
- **THEN** each successful migration is recorded in `changelog` with its filename and timestamp

#### Scenario: No pending migrations
- **WHEN** a developer runs `npm run migrate:up` and all migrations are already applied
- **THEN** the command outputs a message indicating no pending migrations and exits successfully

### Requirement: Rollback last migration
The system SHALL provide an npm script `migrate:down` that reverts the most recently applied migration by executing its `down()` function and removing its entry from `changelog`.

#### Scenario: Revert last migration
- **WHEN** a developer runs `npm run migrate:down`
- **THEN** the `down()` function of the last applied migration is executed
- **THEN** the migration's entry is removed from the `changelog` collection

#### Scenario: No migrations to revert
- **WHEN** a developer runs `npm run migrate:down` and no migrations have been applied
- **THEN** the command outputs a message indicating nothing to revert and exits successfully

### Requirement: Migration status visibility
The system SHALL provide an npm script `migrate:status` that displays which migrations have been applied and which are pending.

#### Scenario: Show migration status
- **WHEN** a developer runs `npm run migrate:status`
- **THEN** the output lists all migration files with their status (APPLIED with date, or PENDING)

### Requirement: Changelog collection tracks applied migrations
The system SHALL maintain a `changelog` collection in MongoDB that records every applied migration with its filename, timestamp of application, and order.

#### Scenario: Changelog entry created on up
- **WHEN** a migration is successfully applied via `migrate:up`
- **THEN** a document is inserted into `changelog` with `{ fileName, appliedAt }`

#### Scenario: Changelog entry removed on down
- **WHEN** a migration is reverted via `migrate:down`
- **THEN** the corresponding document is removed from `changelog`

### Requirement: Configuration uses existing appsettings.json
The system SHALL read the MongoDB connection URI from `appsettings.json` (with environment variable override) so that migration configuration stays in sync with the application configuration.

#### Scenario: Config reads from appsettings.json
- **WHEN** `migrate-mongo-config.js` is loaded
- **THEN** it reads `database.uri` from `appsettings.json` as the connection string

#### Scenario: Environment variable overrides file config
- **WHEN** the `MONGODB_URI` environment variable is set
- **THEN** the migration tool uses the env var value instead of the file value

### Requirement: Baseline migration documents current schema
The system SHALL include an initial baseline migration that documents the current state of all collections and their indexes as a reference point.

#### Scenario: Baseline migration applied to empty database
- **WHEN** `migrate:up` is run on a fresh database
- **THEN** the baseline migration creates all expected indexes and validates the schema structure exists

#### Scenario: Baseline migration is idempotent
- **WHEN** the baseline migration runs on a database that already has the collections
- **THEN** it completes without errors (uses createIndex with existing indexes gracefully)

### Requirement: Optional auto-migration on startup
The system SHALL support an optional configuration `database.runMigrationsOnStart` that, when set to `true`, automatically applies pending migrations before the application starts accepting requests.

#### Scenario: Auto-migration enabled
- **WHEN** `database.runMigrationsOnStart` is `true` in appsettings.json
- **THEN** the application runs pending migrations during startup before listening on the port

#### Scenario: Auto-migration disabled (default)
- **WHEN** `database.runMigrationsOnStart` is `false` or not set
- **THEN** the application starts normally without running migrations

#### Scenario: Auto-migration failure stops startup
- **WHEN** auto-migration is enabled and a migration fails
- **THEN** the application logs the error and exits with a non-zero code instead of starting
