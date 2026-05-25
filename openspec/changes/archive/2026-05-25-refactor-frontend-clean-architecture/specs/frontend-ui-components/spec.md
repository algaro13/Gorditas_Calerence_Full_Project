## ADDED Requirements

### Requirement: Reusable Button component
The system SHALL provide a `Button` component with variants (primary, secondary, danger), sizes (sm, md, lg), loading state, and disabled state.

#### Scenario: Button renders with variant
- **WHEN** `<Button variant="primary">Guardar</Button>` is rendered
- **THEN** it displays with the primary color scheme (orange/brand color)

#### Scenario: Button shows loading state
- **WHEN** `<Button loading>Guardando...</Button>` is rendered
- **THEN** it displays a spinner and is disabled

### Requirement: Reusable Modal component
The system SHALL provide a `Modal` component with title, content area, footer actions, and overlay click-to-close.

#### Scenario: Modal opens and closes
- **WHEN** `<Modal isOpen={true} onClose={fn}>content</Modal>` is rendered
- **THEN** it displays centered with an overlay, and clicking the overlay or close button calls `onClose`

#### Scenario: Modal has configurable size
- **WHEN** `<Modal size="lg">` is used
- **THEN** the modal renders with a larger width

### Requirement: Reusable Table component
The system SHALL provide a `Table` component that accepts columns definition and data array, with optional pagination display.

#### Scenario: Table renders data
- **WHEN** `<Table columns={cols} data={items} />` is rendered
- **THEN** it displays a styled table with headers from columns and rows from data

#### Scenario: Table shows empty state
- **WHEN** `<Table columns={cols} data={[]} />` is rendered
- **THEN** it displays a "No hay datos" message

### Requirement: Reusable FormInput component
The system SHALL provide a `FormInput` component with label, error message display, and common input types (text, number, email, password, select).

#### Scenario: FormInput shows validation error
- **WHEN** `<FormInput error="Campo requerido" />` is rendered
- **THEN** it displays the error message in red below the input

### Requirement: Reusable LoadingSpinner component
The system SHALL provide a `LoadingSpinner` component for consistent loading indicators across the app.

#### Scenario: Full page loading
- **WHEN** `<LoadingSpinner fullPage />` is rendered
- **THEN** it displays centered in the viewport with the brand color spinner

### Requirement: Reusable ErrorMessage component
The system SHALL provide an `ErrorMessage` component for consistent error display with optional retry action.

#### Scenario: Error with retry
- **WHEN** `<ErrorMessage message="Error" onRetry={fn} />` is rendered
- **THEN** it displays the error message with a "Reintentar" button that calls `onRetry`
