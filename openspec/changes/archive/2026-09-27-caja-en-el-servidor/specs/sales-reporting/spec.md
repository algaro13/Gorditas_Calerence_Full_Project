## ADDED Requirements

### Requirement: The cash box belongs to the restaurant
The amount of cash recorded for a day SHALL be stored server-side against the restaurant and that day, under the same tenant isolation as the rest of the data, and SHALL NOT be kept in the browser.

The system SHALL expose reading the amounts of a period and setting the amount of a day, to the same roles that may read the report. The day SHALL be a date without a time, in the restaurant's day.

Amounts previously recorded in a browser SHALL be uploaded once, only for days the server does not already know, and the local copy SHALL be kept rather than destroyed.

#### Scenario: Two devices, one till
- **WHEN** an Encargado records the cash box on a phone and a second person opens the report on another device
- **THEN** both see the same amount and the same resulting profit

#### Scenario: Two restaurants in one browser
- **WHEN** two restaurants are used from the same browser
- **THEN** neither one's cash box appears in the other's report

#### Scenario: A browser that had amounts recorded
- **WHEN** the report is opened in a browser holding amounts recorded before, for days the server does not know
- **THEN** those amounts are uploaded once and appear in the report from any device afterwards
