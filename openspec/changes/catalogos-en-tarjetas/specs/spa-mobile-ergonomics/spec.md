## MODIFIED Requirements

### Requirement: Records are readable and actionable on a phone
A screen that lists records SHALL present them on a phone in a form where every record reads on its own and its actions are reachable without scrolling sideways.

A table MAY be used from tablet width upward, where comparing rows across aligned columns is possible and worth its cost. On a phone it SHALL NOT be the only presentation, because the columns that fall off the right edge are the ones a table places last — which in this system was consistently the actions column.

Where both presentations exist, each field SHALL be defined once and used by both. Two copies of the same field diverge at the first change, and the divergence only shows on one screen size.

A control SHALL NOT extend beyond the bounds of the container it is drawn in, not merely beyond the viewport. A control that stops exactly at the screen edge passes a viewport check and is still clipped.

Where a screen serves several record types whose fields differ, both presentations SHALL honour the same conditions, so that the screen stays one screen rather than one per type.

#### Scenario: Acting on a record from a phone
- **WHEN** an operator opens a list of records on a phone
- **THEN** every action for a record is visible within the screen, with no horizontal scrolling and no hidden column

#### Scenario: The same list on a wide screen
- **WHEN** the same list is opened at tablet width or wider
- **THEN** it may be shown as a table, with all of its columns visible

#### Scenario: A control wider than its card
- **WHEN** a control does not fit the container it is drawn in
- **THEN** the layout gives it room rather than letting it overflow, and a test reports the overflow against the container

#### Scenario: A list whose fields depend on the record type
- **WHEN** a screen lists a type whose fields differ from another it also serves
- **THEN** the phone and the wide presentations show and hide the same fields
