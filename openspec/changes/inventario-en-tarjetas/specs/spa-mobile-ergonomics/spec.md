## ADDED Requirements

### Requirement: Records are readable and actionable on a phone
A screen that lists records SHALL present them on a phone in a form where every record reads on its own and its actions are reachable without scrolling sideways.

A table MAY be used from tablet width upward, where comparing rows across aligned columns is possible and worth its cost. On a phone it SHALL NOT be the only presentation, because the columns that fall off the right edge are the ones a table places last — which in this system was consistently the actions column.

Where both presentations exist, each field SHALL be defined once and used by both. Two copies of the same field diverge at the first change, and the divergence only shows on one screen size.

#### Scenario: Acting on a record from a phone
- **WHEN** an operator opens a list of records on a phone
- **THEN** every action for a record is visible within the screen, with no horizontal scrolling and no hidden column

#### Scenario: The same list on a wide screen
- **WHEN** the same list is opened at tablet width or wider
- **THEN** it may be shown as a table, with all of its columns visible
