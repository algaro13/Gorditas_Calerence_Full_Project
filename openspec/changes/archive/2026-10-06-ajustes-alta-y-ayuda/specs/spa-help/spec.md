## ADDED Requirements

### Requirement: In-app help manual for administrators
The SPA SHALL offer administrators a Help page at `/ayuda`, reachable from the menu, with an index that links to one section per task and a frequently asked questions section. Each task section SHALL list numbered steps and, where useful, a screenshot that marks where to click.

#### Scenario: An administrator opens the help
- **WHEN** an administrator opens Ayuda from the menu
- **THEN** the index lists the sections and choosing one scrolls to its numbered steps

#### Scenario: Help on a phone
- **WHEN** the Help page is shown on a 375 px wide screen
- **THEN** the text and screenshots fit the screen without horizontal scrolling
