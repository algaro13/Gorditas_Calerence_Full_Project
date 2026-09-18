## ADDED Requirements

### Requirement: The quota evaluation runs without manual setup
The daily quota evaluation SHALL be scheduled by the backend itself, so that starting the stack is enough to make the grace period expire. It SHALL NOT depend on a host cron entry, a separate container, or any step performed outside the repository, so that a server rebuilt from a backup resumes the evaluation with no manual action.

The evaluation SHALL run shortly after the backend starts and then at a fixed interval of 24 hours, rather than at a fixed time of day, so that a restart cannot skip a day. A run SHALL be skipped while the previous one is still in progress. The scheduler SHALL stop cleanly when the process shuts down, and SHALL NOT run in the test environment.

Running the evaluation more often than necessary SHALL be harmless: the grace period restarts from zero after an adjustment, so a repeated run never deactivates more members than the plan requires.

A manual entry point SHALL remain available for running the evaluation on demand during an incident.

#### Scenario: A fresh or restored server
- **WHEN** the stack is started on a new VPS, or on one rebuilt from a backup
- **THEN** the quota evaluation is scheduled automatically, with no cron entry to install and no step to remember in the recovery runbook

#### Scenario: A run is still in progress
- **WHEN** the interval elapses while the previous evaluation has not finished
- **THEN** the new run is skipped and the reason is recorded, instead of two evaluations overlapping

#### Scenario: Shutdown
- **WHEN** the process is asked to shut down
- **THEN** the scheduler stops and leaves no pending timer behind
