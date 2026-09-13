## MODIFIED Requirements

### Requirement: Backups and restore procedure
The stack SHALL back up both databases every 6 hours, keep 14 days locally, and document in `docs/recuperacion.md` the ordered procedure to restore both databases, the `uploads` volume and every non-versioned secret onto a clean machine, including the Zitadel masterkey.

The procedure SHALL state that the emergency restore uses `docker-compose.yaml` (Caddy issues its own certificates on a clean host) rather than `docker-compose.behind-proxy.yaml`, and SHALL warn that `prod:bootstrap` MUST NOT be re-run after restoring the `zitadel` dump, because the dump already contains the project, roles, apps and organizations and a second run would create a duplicate project.

#### Scenario: Restore drill
- **WHEN** the operator follows the restore steps in `docs/recuperacion.md` on a scratch container
- **THEN** the POS starts against the restored data and Zitadel accepts logins

#### Scenario: Ownership after restore
- **WHEN** both dumps are restored with `pg_restore --no-owner` and `REASSIGN OWNED BY postgres TO pos_migrator` is applied
- **THEN** `pos_app` can read and write every business table under RLS and the backend starts without permission errors

## ADDED Requirements

### Requirement: Off-site encrypted backup
A scheduled host job SHALL push an encrypted, deduplicated snapshot to object storage outside the server after every database dump. The snapshot SHALL contain the dumps of both databases, the `uploads` volume, the non-versioned secrets (`./.env`, `./.local/`, `Gorditas_Calerence_Backend/.env.production`, `Gorditas_frontend/project/.env.production`) and a manifest. Retention SHALL keep 14 daily, 8 weekly and 12 monthly snapshots.

#### Scenario: Snapshot contents
- **WHEN** the operator lists the newest snapshot
- **THEN** it contains both database dumps, the tenant logos, the five secret files and `MANIFIESTO.txt`

#### Scenario: Stored data is unreadable without the passphrase
- **WHEN** a raw object is read directly from the bucket
- **THEN** no plaintext from the dumps, the secrets or the logos is recoverable from it

#### Scenario: Logos survive a database-only view
- **WHEN** a tenant row references `/uploads/<tenantId>/logo.png` and the snapshot is restored in full
- **THEN** the referenced file exists in the restored `uploads` volume

### Requirement: Bootstrap envelope
The documentation SHALL define the minimum set of secrets that cannot live inside the backup because they are required to decrypt or reach it: the repository location and passphrase, the object-storage credentials, the `ZITADEL_MASTERKEY` and the source repository URL. These SHALL be recorded outside the server and the backup job SHALL NOT include its own credentials file in the snapshot.

#### Scenario: Recovery from the envelope alone
- **WHEN** an operator has only the bootstrap envelope and a clean machine with Docker
- **THEN** the documented procedure is sufficient to reach a running system with the restored data

#### Scenario: Masterkey verification without exposure
- **WHEN** the operator compares the stored masterkey against the deployed one
- **THEN** a fingerprint comparison confirms they match without printing the key

### Requirement: Backup failure alerting
The backup job SHALL notify an external dead man's switch only on success, so that a backup that stops happening raises an alert without anyone inspecting the server. The job SHALL exit non-zero when the dump, the snapshot or the retention step fails.

#### Scenario: Backup stops running
- **WHEN** the scheduled job does not complete for longer than the configured grace period
- **THEN** the operator receives an alert

#### Scenario: Backup service left out of the stack
- **WHEN** the stack is started naming services and the database dump job is omitted
- **THEN** the backup job fails loudly and no success ping is sent

### Requirement: Recovery rehearsal
The repository SHALL provide a verification script that restores the newest snapshot into a throwaway database and checks row counts and secret completeness, and `docs/recuperacion.md` SHALL record the measured recovery time from a full rehearsal on a disposable host rather than an estimate.

#### Scenario: Periodic verification
- **WHEN** the verification script runs
- **THEN** it reports that the snapshot decrypts, both dumps are readable, the five secret files are present, and the row counts of `tenants`, `ordenes` and `platillos` match production

#### Scenario: Full rehearsal
- **WHEN** the snapshot is restored onto a disposable host that resolves the production domain locally through its `hosts` file
- **THEN** a user can sign in, create an order, charge it, see it in reports and load the tenant logo, and the elapsed time is recorded as the recovery objective
