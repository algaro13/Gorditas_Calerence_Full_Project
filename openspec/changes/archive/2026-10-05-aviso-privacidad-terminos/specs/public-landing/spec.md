## ADDED Requirements

### Requirement: Public privacy notice and terms of service
The SPA SHALL publish the privacy notice at `/privacidad` and the terms of service at `/terminos`, readable without signing in, each showing its version date. The landing footer, the sign-in screen and the registration wizard SHALL link to both. While the texts contain example data, each page SHALL show that it is a draft pending legal review.

#### Scenario: A visitor reads the privacy notice
- **WHEN** a visitor opens `/privacidad` without a session
- **THEN** the privacy notice is shown with its version date

#### Scenario: The registration asks for acceptance
- **WHEN** a user fills in the account step of the registration without checking the acceptance box
- **THEN** the user cannot continue, and the box links to both documents
