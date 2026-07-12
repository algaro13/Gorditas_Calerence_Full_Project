## ADDED Requirements

### Requirement: Tenant has configurable color palette
The system SHALL allow each tenant to select a color palette that is applied to their entire UI.

#### Scenario: Palette selection during onboarding
- **WHEN** the user selects "Verde" in step 3 of onboarding
- **THEN** the tenant config stores `paleta: 'green'`

#### Scenario: Palette applied on app load
- **WHEN** the frontend loads for a tenant with `paleta: 'green'`
- **THEN** CSS variables are set to green theme colors (sidebar, buttons, accents)

### Requirement: Seven predefined palettes available
The system SHALL offer seven color palettes: Naranja (default), Rojo, Verde, Azul, Morado, Café, Oscuro.

#### Scenario: Preview palette before selecting
- **WHEN** the user hovers or clicks a palette option
- **THEN** the UI shows a live preview of how the sidebar and buttons would look

### Requirement: Palette persists across sessions
The system SHALL load the tenant's palette from the backend config on every page load.

#### Scenario: Returning user sees their palette
- **WHEN** a user logs in to their tenant
- **THEN** the color palette configured during onboarding is applied automatically
