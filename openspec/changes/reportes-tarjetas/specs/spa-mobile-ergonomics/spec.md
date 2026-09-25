## ADDED Requirements

### Requirement: Reports read as records on a phone
On screens narrower than the tablet breakpoint, the reports screen SHALL present each record —a
day's sales, an order, a stock line, a product sold, an expense— as a self-contained card rather
than a table row, and SHALL keep every action for that record visible without sideways
scrolling.

Where a list carries a total, the total SHALL remain present and SHALL equal the sum of the
records shown.

From the tablet breakpoint up the screen MAY present the same records as a table, where
comparing rows across aligned columns is worth its cost. Both presentations SHALL derive each
field from a single definition, so that a correction to one cannot leave the other behind.

Controls on this screen SHALL be named in full words rather than abbreviations.

The exported spreadsheet SHALL be unaffected, as it is produced from the data rather than from
what is on screen.

#### Scenario: Reading the day's takings on a phone
- **WHEN** the manager opens the sales report on a phone
- **THEN** each day's figures and its actions are readable without scrolling sideways

#### Scenario: Looking into one order
- **WHEN** the manager opens the detail of an order
- **THEN** its products, dishes and extras read as lines with their amounts, not as tables inside a table

#### Scenario: Removing an expense
- **WHEN** the manager finds an expense to delete on a phone
- **THEN** the delete action is visible on that expense's card
