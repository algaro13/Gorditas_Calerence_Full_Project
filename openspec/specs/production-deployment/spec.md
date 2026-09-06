# production-deployment Specification

## Purpose
TBD - created by archiving change production-deploy. Update Purpose after archive.
## Requirements
### Requirement: Single-command production stack
The repository SHALL provide a production `docker-compose.yaml` that starts PostgreSQL, Zitadel (API + Login v2), the backend, a one-shot frontend build, Caddy and a daily backup job, reading all secrets from a non-versioned root `.env` and exposing only ports 80 and 443 through Caddy.

#### Scenario: Fresh VPS
- **WHEN** an operator clones the repository, fills `.env` and runs `npm run prod:up`, `npm run prod:bootstrap` and `npm run prod:up`
- **THEN** `https://auth.<APP_DOMAIN>/.well-known/openid-configuration`, `https://api.<APP_DOMAIN>/health`, `https://app.<APP_DOMAIN>/` and `https://<slug>.<APP_DOMAIN>/` answer 200 over a Let's Encrypt wildcard certificate

#### Scenario: Compose file is valid without a VPS
- **WHEN** `docker compose config` runs with the example variables
- **THEN** it renders without errors and no service other than `caddy` publishes ports

### Requirement: Domain-parametrized reverse proxy
The Caddy configuration SHALL derive every host from `APP_DOMAIN`, route `auth.` to Zitadel (Login v2 paths to the login container, everything else to the API over h2c without the `TE` header), `api.` to the backend, `app.` and any tenant subdomain to the static SPA, and answer 404 for unknown hosts.

#### Scenario: Tenant subdomain
- **WHEN** a browser requests `https://demo.<APP_DOMAIN>/nueva-orden`
- **THEN** Caddy serves the SPA `index.html` (history fallback) with the wildcard certificate

### Requirement: Backups and restore procedure
The stack SHALL back up both databases daily, keep 14 days, and document restoration of both databases plus the Zitadel masterkey.

#### Scenario: Restore drill
- **WHEN** the operator follows the restore steps in `infra/README.md` on a scratch container
- **THEN** the POS starts against the restored data and Zitadel accepts logins

### Requirement: Domain change procedure
`docs/cambiar-dominio.md` SHALL list the ordered steps to move to a new domain (Cloudflare zone and token, `APP_DOMAIN` in the three env files, Caddy, Zitadel external domain and bootstrap re-run, Stripe webhook, 301 from the old domain, tenant notice) without code changes.

#### Scenario: Rename
- **WHEN** `APP_DOMAIN` changes and the procedure is followed
- **THEN** no source file needs editing and the ESLint guard against literal domains still passes

