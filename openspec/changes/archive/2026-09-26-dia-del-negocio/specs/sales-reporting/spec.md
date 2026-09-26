## ADDED Requirements

### Requirement: Today means the restaurant's today
The day a report opens on SHALL be the current day in the restaurant's time zone, and SHALL NOT be derived from UTC.

`GET /api/tenants/me` SHALL state that time zone so the SPA and the API agree on which day is being asked for. Where no time zone is known the SPA SHALL fall back to the browser's own zone, never to UTC.

The same day SHALL be used wherever the screen records something against today, such as the cash box amount, so that money entered in the evening is not filed under tomorrow.

#### Scenario: Opening the report during dinner service
- **WHEN** an Encargado opens the sales report at 18:04 in Mexico City, which is 00:04 UTC of the next day
- **THEN** the report opens on the current Mexico City day and shows that day's sales

#### Scenario: Recording cash in the evening
- **WHEN** cash is added to the box at 20:00 local time
- **THEN** it is recorded against the current local day, not the next one
