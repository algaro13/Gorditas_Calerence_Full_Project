## ADDED Requirements

### Requirement: The end of the trial is told by email
The system SHALL email the active Admins of a restaurant on trial, at their real address, twice: once when the trial ends in 3 days or less ("Tu prueba termina el …") and once after it has ended, provided it ended no more than 7 days ago ("Tu prueba terminó"). Each email SHALL be sent at most once per trial end date: a sent email is recorded with that date, a failed one is not and is retried on the next run. A restaurant that is no longer on trial, and members who are not Admins, SHALL receive nothing.

The emails SHALL be in Spanish, name the restaurant, state the date in the business time zone, list the plans with their price and link to the restaurant's plans screen. The one sent after the end SHALL say that the data is intact.

The backend SHALL send them by SMTP configured through `SMTP_*` variables. Without `SMTP_HOST` it SHALL write the email to the log instead of failing.

#### Scenario: Three days to go
- **WHEN** the daily job runs and a restaurant's trial ends in less than 3 days
- **THEN** its active Admins receive "Tu prueba termina el …" with a link to its plans screen, and the next run sends nothing

#### Scenario: The trial ended yesterday
- **WHEN** the daily job runs and a restaurant's trial ended yesterday
- **THEN** its active Admins receive "Tu prueba terminó", once

#### Scenario: A trial that ended long ago
- **WHEN** the job runs for the first time and a restaurant's trial ended two months ago
- **THEN** nothing is sent to it

#### Scenario: Already paying
- **WHEN** a restaurant has subscribed before its trial date
- **THEN** it receives no trial email
