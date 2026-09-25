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
The stack SHALL dump both databases at least daily and again on every off-site backup run (at most 6 hours apart), keep 14 days locally, and document in `docs/recuperacion.md` the ordered procedure to restore both databases, the `uploads` volume and every non-versioned secret onto a clean machine, including the Zitadel masterkey.

The procedure SHALL state that the emergency restore uses `docker-compose.yaml` (Caddy issues its own certificates on a clean host) rather than `docker-compose.behind-proxy.yaml`, and SHALL warn that `prod:bootstrap` MUST NOT be re-run after restoring the `zitadel` dump, because the dump already contains the project, roles, apps and organizations and a second run would create a duplicate project.

#### Scenario: Restore drill
- **WHEN** the operator follows the restore steps in `docs/recuperacion.md` on a scratch container
- **THEN** the POS starts against the restored data and Zitadel accepts logins

#### Scenario: Ownership after restore
- **WHEN** both dumps are restored with `pg_restore --no-owner` and `REASSIGN OWNED BY postgres TO pos_migrator` is applied
- **THEN** `pos_app` can read and write every business table under RLS and the backend starts without permission errors

### Requirement: Domain change procedure
`docs/cambiar-dominio.md` SHALL list the ordered steps to move to a new domain (Cloudflare zone and token, `APP_DOMAIN` in the three env files, Caddy, Zitadel external domain and bootstrap re-run, Stripe webhook, 301 from the old domain, tenant notice) without code changes.

#### Scenario: Rename
- **WHEN** `APP_DOMAIN` changes and the procedure is followed
- **THEN** no source file needs editing and the ESLint guard against literal domains still passes

### Requirement: Off-site encrypted backup
A scheduled service started by the production stack SHALL push an encrypted, deduplicated snapshot to object storage outside the server after every database dump. The snapshot SHALL contain the dumps of both databases, the `uploads` volume, the non-versioned secrets (`./.env`, `./.local/`, `Gorditas_Calerence_Backend/.env.production`, `Gorditas_frontend/project/.env.production`) and a manifest. Retention SHALL keep 14 daily, 8 weekly and 12 monthly snapshots.

The schedule SHALL live in the repository, not in a host crontab, so that starting the stack is enough to arm the backup on a fresh server and on one rebuilt from a snapshot, with nothing to install or remember. The service SHALL NOT require access to the Docker socket, because that would grant it root-equivalent control of the host; it SHALL read what it needs through read-only mounts instead.

The backup SHALL remain runnable on demand for a rehearsal or an incident, without waiting for the schedule.

#### Scenario: Snapshot contents
- **WHEN** the operator lists the newest snapshot
- **THEN** it contains both database dumps, the tenant logos, the five secret files and `MANIFIESTO.txt`

#### Scenario: Stored data is unreadable without the passphrase
- **WHEN** a raw object is read directly from the bucket
- **THEN** no plaintext from the dumps, the secrets or the logos is recoverable from it

#### Scenario: Logos survive a database-only view
- **WHEN** a tenant row references `/uploads/<tenantId>/logo.png` and the snapshot is restored in full
- **THEN** the referenced file exists in the restored `uploads` volume

#### Scenario: A rebuilt server backs itself up
- **WHEN** a server is restored from a snapshot and the stack is started
- **THEN** the backup runs on its schedule with no cron entry installed and no manual step

#### Scenario: On-demand run
- **WHEN** the operator triggers the backup by hand during a rehearsal
- **THEN** it produces a snapshot without waiting for the schedule and without interfering with a scheduled run already in progress

### Requirement: Bootstrap envelope
The documentation SHALL define the minimum set of secrets that cannot live inside the backup because they are required to decrypt or reach it: the repository location and passphrase, the object-storage credentials, the `ZITADEL_MASTERKEY` and the source repository URL. These SHALL be recorded outside the server and the backup job SHALL NOT include its own credentials file in the snapshot.

#### Scenario: Recovery from the envelope alone
- **WHEN** an operator has only the bootstrap envelope and a clean machine with Docker
- **THEN** the documented procedure is sufficient to reach a running system with the restored data

#### Scenario: Masterkey verification without exposure
- **WHEN** the operator compares the stored masterkey against the deployed one
- **THEN** a fingerprint comparison confirms they match without printing the key

### Requirement: Backup failure alerting
The backup job SHALL notify an external dead man's switch only on success, so that a backup that stops happening raises an alert without anyone inspecting the server. The job SHALL exit non-zero when the dump it is about to capture is missing or stale, or when the snapshot or the retention step fails.

Because the backup no longer triggers the dump itself, it SHALL verify that the most recent dump is recent enough before capturing it, and SHALL refuse to send a success ping otherwise. A snapshot of a stale dump that reported success would be worse than no backup, because it would look healthy.

#### Scenario: Backup stops running
- **WHEN** the scheduled job does not complete for longer than the configured grace period
- **THEN** the operator receives an alert

#### Scenario: The dump job is not producing dumps
- **WHEN** the dump service is absent, stopped, or failing silently, so the newest dump is older than the allowed age
- **THEN** the backup fails loudly, sends no success ping, and the dead man's switch alerts

### Requirement: Recovery rehearsal
The repository SHALL provide a verification script that restores the newest snapshot into a throwaway database and checks row counts and secret completeness, and `docs/recuperacion.md` SHALL record the measured recovery time from a full rehearsal on a disposable host rather than an estimate.

The alerting path SHALL be rehearsed as well, not only the restore path, and `docs/recuperacion.md` SHALL record when it was last exercised and what the result was. A backup system rests on its alert: a broken alert fails as silence, which is indistinguishable from everything working, so an alert that has never fired is a hypothesis in the same way an unrestored backup is.

Exercising the alert SHALL be possible without stopping the dump service and without disturbing the scheduled backup, so that the rehearsal never puts real backups at risk — a rehearsal that did would simply never be performed.

#### Scenario: Periodic verification
- **WHEN** the verification script runs
- **THEN** it reports that the snapshot decrypts, both dumps are readable, the five secret files are present, and the row counts of `tenants`, `ordenes` and `platillos` match production

#### Scenario: Full rehearsal
- **WHEN** the snapshot is restored onto a disposable host that resolves the production domain locally through its `hosts` file
- **THEN** a user can sign in, create an order, charge it, see it in reports and load the tenant logo, and the elapsed time is recorded as the recovery objective

#### Scenario: Alerting rehearsal
- **WHEN** an operator exercises the failure path on the running system
- **THEN** the backup fails naming which dump is stale and how old it is rather than reporting a generic error, sends no success ping, the dead man's switch accepts the failure signal, and the scheduled backup service carries on with its next run unaffected

