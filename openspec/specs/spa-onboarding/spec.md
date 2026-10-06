# spa-onboarding Specification

## Purpose
TBD - created by archiving change frontend-zitadel. Update Purpose after archive.
## Requirements
### Requirement: Public wizard with administrator account
The onboarding wizard SHALL be public, start with an account step (nombre, apellido, correo, contraseña, confirmación) validated client-side against the identity provider password policy (8+ characters with uppercase, lowercase, digit and symbol; matching confirmation), keep the existing steps (negocio y slug, imagen, paleta, mesas, catálogo) and post everything to `POST /api/onboarding/complete`.

#### Scenario: Complete registration
- **WHEN** the user finishes the wizard
- **THEN** a success screen shows the tenant address, mentions the verification email and offers "Ir a mi restaurante" linking to the returned url (on localhost it sets `devTenantSlug` and links to `/login`)

#### Scenario: Slug preview uses the configured domain
- **WHEN** the user types the business name
- **THEN** the preview shows `<slug>.<VITE_APP_DOMAIN>` and the availability from `check-slug`

#### Scenario: API error
- **WHEN** the API responds 409 or 400
- **THEN** the message from the API is shown and the user can correct the form

### Requirement: The registration wizard fits a phone screen
On a 375 px wide screen the registration wizard SHALL show its step indicator and every input row inside the card, without horizontal scrolling. The final screen SHALL tell the user that the verification email may arrive in the spam or junk folder.

#### Scenario: Adding a dish on a phone
- **WHEN** the user reaches the quick catalog step on a 375 px wide screen
- **THEN** the dish name, the price and the add button are all visible inside the card

#### Scenario: Example catalog
- **WHEN** the user loads the example catalog
- **THEN** the dishes are Gordita de harina, Gordita de maíz, Quesadilla, Taco and Burrito

