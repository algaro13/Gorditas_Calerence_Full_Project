## ADDED Requirements

### Requirement: Business image upload during onboarding
The system SHALL allow users to upload a logo or photo of their business during onboarding step 2.

#### Scenario: User uploads image
- **WHEN** the user drags or selects an image file (jpg, png, webp, max 2MB)
- **THEN** the image is uploaded and a preview is shown

#### Scenario: Invalid file rejected
- **WHEN** the user tries to upload a file larger than 2MB or invalid format
- **THEN** an error message is shown without uploading

### Requirement: Image stored and served
The system SHALL store uploaded images on the server and serve them via a public URL.

#### Scenario: Image accessible after upload
- **WHEN** an image is uploaded for tenant "gorditas-calerence"
- **THEN** it is accessible at `/uploads/gorditas-calerence/logo.{ext}`

### Requirement: Image displayed in the app header
The system SHALL display the tenant's business image in the app header/sidebar replacing the default icon.

#### Scenario: Tenant has custom image
- **WHEN** the app loads for a tenant with a configured image
- **THEN** the header shows the business image instead of the default chef hat icon
