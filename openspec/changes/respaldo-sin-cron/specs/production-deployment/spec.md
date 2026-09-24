## MODIFIED Requirements

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

### Requirement: Backup failure alerting
The backup job SHALL notify an external dead man's switch only on success, so that a backup that stops happening raises an alert without anyone inspecting the server. The job SHALL exit non-zero when the dump it is about to capture is missing or stale, or when the snapshot or the retention step fails.

Because the backup no longer triggers the dump itself, it SHALL verify that the most recent dump is recent enough before capturing it, and SHALL refuse to send a success ping otherwise. A snapshot of a stale dump that reported success would be worse than no backup, because it would look healthy.

#### Scenario: Backup stops running
- **WHEN** the scheduled job does not complete for longer than the configured grace period
- **THEN** the operator receives an alert

#### Scenario: The dump job is not producing dumps
- **WHEN** the dump service is absent, stopped, or failing silently, so the newest dump is older than the allowed age
- **THEN** the backup fails loudly, sends no success ping, and the dead man's switch alerts
