## ADDED Requirements

### Requirement: Abandoned accounts are warned before they are archived
A daily job SHALL warn the active Admins of an inactive restaurant by email and then archive it, following these thresholds in days without use: a trial that never paid is warned at 30 and 60 days and archived at 90; a restaurant that paid and canceled is warned at 365 and 395 days and archived at 425; a restaurant that is paying, has a pending payment or has a plan assigned without Stripe SHALL never be warned nor archived. Each step SHALL happen once per period of inactivity and in order: the second warning only after the first, archiving only after the second, and at least 7 days between steps. Using the system again SHALL restart the cycle. The operator SHALL be able to pause the cycle for a restaurant.

Each warning SHALL state the date the restaurant would be archived, link to sign in (which is enough to keep it) and to the reports, where the data can be downloaded.

#### Scenario: A trial abandoned for a month
- **WHEN** a trial that never paid reaches 30 days without use
- **THEN** its Admins receive the first warning, once

#### Scenario: A paying restaurant that does not use the system
- **WHEN** a paying restaurant reaches 400 days without use
- **THEN** it receives no warning and is not archived

#### Scenario: The job skipped some days
- **WHEN** a trial reaches 95 days without use and only the first warning was ever sent
- **THEN** the job sends the second warning and does not archive it yet

### Requirement: An archived restaurant can be recovered for 30 days
Archiving SHALL block the restaurant without deleting any data. Its users SHALL see that it is archived; its Admins SHALL be able to recover it with one action during 30 days, and the operator SHALL be able to restore it from the console. Recovering SHALL return everything as it was.

#### Scenario: The owner comes back
- **WHEN** the Admin of an archived restaurant signs in and recovers it
- **THEN** the restaurant operates again with all its data

### Requirement: Deletion is approved by the operator
A restaurant SHALL only be deleted by the platform operator from the console, when it is archived and its 30-day recovery period has passed, and after typing its subdomain to confirm. Deletion SHALL remove its data, its Zitadel organization and its files, and SHALL record in the console log who deleted it, when, and the restaurant's basic data. A paying restaurant SHALL NOT be deletable.

#### Scenario: Approving too early
- **WHEN** the operator tries to delete a restaurant archived 10 days ago
- **THEN** the request is refused and nothing is deleted

#### Scenario: Approving a deletion
- **WHEN** the operator approves the deletion of a restaurant archived 31 days ago, typing its subdomain
- **THEN** its data and organization are deleted and the log records it
