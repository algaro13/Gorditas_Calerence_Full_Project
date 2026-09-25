## MODIFIED Requirements

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
