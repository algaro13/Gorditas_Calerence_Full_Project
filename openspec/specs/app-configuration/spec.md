## ADDED Requirements

### Requirement: Centralized configuration via appsettings.json
The system SHALL load application configuration from an `appsettings.json` file located at the root of the backend project. This file MUST contain all configurable connection strings and application settings.

#### Scenario: Load database configuration
- **WHEN** the application starts
- **THEN** it reads the MongoDB connection URI and options from `appsettings.json` under the `database` key

#### Scenario: Load JWT configuration
- **WHEN** the authentication service needs the JWT secret and token expiration time
- **THEN** it obtains the secret and `expiresIn` value from the centralized configuration object, not from `process.env` directly

### Requirement: Token expiration is configurable via appsettings.json
The system SHALL allow configuring the JWT token validity duration through the `jwt.expiresIn` field in `appsettings.json`. The value MUST follow the format accepted by the `jsonwebtoken` library (e.g., `"7d"`, `"24h"`, `"3600"`).

#### Scenario: Token uses configured expiration
- **WHEN** a JWT token is signed during login
- **THEN** the token's expiration is set to the value of `jwt.expiresIn` from the configuration

#### Scenario: Default expiration when not configured
- **WHEN** `jwt.expiresIn` is not present in `appsettings.json` or environment variables
- **THEN** the system uses a default expiration of `"7d"` (7 days)

#### Scenario: Load server configuration
- **WHEN** the Express server starts listening
- **THEN** it reads the port from the centralized configuration object

### Requirement: Environment variables override appsettings.json
The system SHALL allow environment variables to override values defined in `appsettings.json`. Environment variables MUST take precedence over file-based configuration.

#### Scenario: MONGODB_URI env var overrides file
- **WHEN** the environment variable `MONGODB_URI` is set
- **THEN** the system uses the env var value instead of `database.uri` from `appsettings.json`

#### Scenario: No env var uses file default
- **WHEN** no environment variable is set for a configuration key
- **THEN** the system uses the value from `appsettings.json`

### Requirement: Typed configuration object
The system SHALL expose configuration through a strongly-typed TypeScript interface (`AppSettings`) that provides compile-time safety for all configuration access.

#### Scenario: Type-safe access to database config
- **WHEN** a module imports the configuration
- **THEN** it accesses `appSettings.database.uri` with full TypeScript autocompletion and type checking

#### Scenario: Missing required configuration fails at startup
- **WHEN** a required configuration value (e.g., `database.uri`) is missing from both `appsettings.json` and environment variables
- **THEN** the application fails to start with a clear error message indicating which configuration is missing

### Requirement: Configuration is injected, not imported globally
The system SHALL pass configuration to services and repositories via constructor injection or the composition root, rather than having modules read configuration directly.

#### Scenario: Database module receives config
- **WHEN** the database connection is established
- **THEN** it receives the connection URI and options from the configuration object passed to it, not by reading `process.env` internally

#### Scenario: Composition root provides config
- **WHEN** the composition root wires dependencies
- **THEN** it loads `AppSettings` once and passes relevant sections to each service/repository that needs them
