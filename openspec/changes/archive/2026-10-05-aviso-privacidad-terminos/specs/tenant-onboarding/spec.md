## ADDED Requirements

### Requirement: Registration requires accepting the privacy notice and the terms
`POST /api/onboarding/complete` SHALL require `aceptaLegal: true` together with the version of the legal texts the user saw, and SHALL reject the registration with 400 otherwise. The restaurant SHALL store the accepted version, the date of acceptance and the email of the administrator who accepted.

#### Scenario: Registration without acceptance
- **WHEN** a registration arrives without `aceptaLegal: true`
- **THEN** it is rejected with 400 and nothing is created

#### Scenario: Registration with acceptance
- **WHEN** a registration arrives with `aceptaLegal: true` and version `2026-10-05`
- **THEN** the restaurant stores version `2026-10-05`, the date and the administrator email
